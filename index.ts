import * as aws from "@pulumi/aws";
import * as pulumi from "@pulumi/pulumi";
import { Input } from "@pulumi/pulumi";
import * as mime from "mime";
import * as path from "path";
import { IWebAclRule } from "./src/types/web-acl-rule";
import { crawlDirectory } from "./src/utils/crawl-directory";
import { createAliasRecord } from "./src/utils/create-alias-record";
import { createWWWAliasRecord } from "./src/utils/create-www-alias-record";
import { getDomainAndSubdomain } from "./src/utils/get-domain-and-subdomain";
import { getDomains } from "./src/utils/get-domains";
import { provisionCloudfrontFunction } from "./src/utils/provisionCloudfrontFunction";

const stackConfig = new pulumi.Config("static-website");

const config = {
  // pathToWebsiteContents is a relative path to the website's contents.
  pathToWebsiteContents: stackConfig.require("pathToWebsiteContents"),
  // targetDomain is the domain/host to serve content at.
  targetDomain: stackConfig.require("targetDomain"),
  // If true create an A record for the www subdomain of targetDomain pointing to the generated cloudfront distribution.
  // If a certificate was generated it will support this subdomain.
  // default: false
  includeWwwSubDomain: stackConfig.getBoolean("includeWwwSubDomain") ?? false,
  author: stackConfig.get("author") ?? "JonDoe",
  org: stackConfig.get("organization") ?? "JonDoe Inc.",
};

const env = pulumi.getStack();
const project = pulumi.getProject();
const tags = {
  author: config.author,
  stack: env,
  repo: project,
  deployment: "pulumi",
  org: config.org,
};

// Bucket to store the website's static content (html files, css files, images, etc.)
const staticContentBucket = new aws.s3.Bucket(
  `${config.targetDomain}-content-bucket`,
  {
    bucket: config.targetDomain,
    tags: tags,
    //do not enable website hosting, otherwise private s3 origin will not work
  }
);

// Sync the contents of the local source directory with the S3 bucket
const webContentsRootPath = path.join(
  process.cwd(),
  config.pathToWebsiteContents
);
console.log("Syncing contents from local disk at", webContentsRootPath);
crawlDirectory(webContentsRootPath, (filePath: string) => {
  const relativeFilePath = filePath.replace(webContentsRootPath + "/", "");
  const contentFile = new aws.s3.BucketObject(
    relativeFilePath,
    {
      key: relativeFilePath,

      acl: "public-read",
      bucket: staticContentBucket,
      contentType: mime.getType(filePath) || undefined,
      source: new pulumi.asset.FileAsset(filePath),
    },
    {
      parent: staticContentBucket,
    }
  );
});

//Some services in AWS are global or only available in one region. In both cases we must choose us-east-1 region.  E.g. for ACM, WAF
const usEastRegion = new aws.Provider("east", {
  profile: aws.config.profile,
  region: "us-east-1", 
});

console.info(`Cert domain name: ${config.targetDomain}`);

const certificateConfig: aws.acm.CertificateArgs = {
  domainName: config.targetDomain,
  tags: tags,
  validationMethod: "DNS",
  subjectAlternativeNames: config.includeWwwSubDomain
    ? [`www.${config.targetDomain}`]
    : [],
};

const certificate = new aws.acm.Certificate("certificate", certificateConfig, {
  provider: usEastRegion,
});

const domainParts = getDomainAndSubdomain(config.targetDomain);

const hostedZoneId = aws.route53
  .getZone({ name: domainParts.parentDomain }, { async: true })
  .then((zone) => zone.zoneId);

const tenMinutes = 60 * 10; // in seconds

/**
 *  Create a DNS record to prove that we _own_ the domain we're requesting a certificate for.
 *  See https://docs.aws.amazon.com/acm/latest/userguide/gs-acm-validate-dns.html for more info.
 */
const certificateValidationDomain = new aws.route53.Record(
  `${config.targetDomain}-validation`,
  {
    name: certificate.domainValidationOptions[0].resourceRecordName,
    zoneId: hostedZoneId,
    type: certificate.domainValidationOptions[0].resourceRecordType,
    records: [certificate.domainValidationOptions[0].resourceRecordValue],
    ttl: tenMinutes,
  }
);

let subdomainCertificateValidationDomain;

if (config.includeWwwSubDomain) {
  // ensure we validate the www subdomain as well
  subdomainCertificateValidationDomain = new aws.route53.Record(
    `${config.targetDomain}-validation2`,
    {
      name: certificate.domainValidationOptions[1].resourceRecordName,
      zoneId: hostedZoneId,
      type: certificate.domainValidationOptions[1].resourceRecordType,
      records: [certificate.domainValidationOptions[1].resourceRecordValue],
      ttl: tenMinutes,
    }
  );
}

// include the validation record for the www subdomain
const validationRecordFqdns =
  subdomainCertificateValidationDomain === undefined
    ? [certificateValidationDomain.fqdn]
    : [
        certificateValidationDomain.fqdn,
        subdomainCertificateValidationDomain.fqdn,
      ];

/**
 * This is a _special_ resource that waits for ACM to complete validation via the DNS record
 * checking for a status of "ISSUED" on the certificate itself. No actual resources are
 * created (or updated or deleted).
 *
 * See https://www.terraform.io/docs/providers/aws/r/acm_certificate_validation.html for slightly more detail
 * and https://github.com/terraform-providers/terraform-provider-aws/blob/master/aws/resource_aws_acm_certificate_validation.go
 * for the actual implementation.
 */
const certificateValidation = new aws.acm.CertificateValidation(
  "certificate-validation",
  {
    certificateArn: certificate.arn,
    validationRecordFqdns: validationRecordFqdns,
  },
  { provider: usEastRegion }
);

const certificateArn = certificateValidation.certificateArn;

const originAccessControl = new aws.cloudfront.OriginAccessControl(
  "origin-access-control",
  {
    description: "Origin Access Control",
    originAccessControlOriginType: "s3",
    signingBehavior: "always",
    signingProtocol: "sigv4",
    name: "oac",
  }
);

const distributionAliases = getDomains(config.includeWwwSubDomain, config.targetDomain);

const ruleName = "blockDirectAccessToCloudfront";

const blockDirectAccessToCloudfront: Input<IWebAclRule> = {
  action: {
    allow: {},
  },
  name: ruleName,
  priority: 100,
  statement: {
    regexMatchStatement: {
      fieldToMatch: {
        singleHeader: {
          name: "host",
        },
      },
      regexString: `^${config.targetDomain}|^www.${config.targetDomain}`,
      textTransformations: [
        {
          priority: 100,
          type: "NONE",
        },
      ],
    },
  },
  visibilityConfig: {
    cloudwatchMetricsEnabled: false,
    metricName: ruleName,
    sampledRequestsEnabled: false,
  },
};

const rulesArray = [
  blockDirectAccessToCloudfront,
  // Add more Rules here if needed
];

const webAcl = new aws.wafv2.WebAcl(
  "block-direct-access-to-cloudfront",
  {
    defaultAction: {
      block: {}, // Block all request except what's allowed by the rules in the rulesArray
    },
    description:
      "Web ACL to block direct access to the cfnid.cloudfront.net address",
    name: "webAclBlockDirectAccessToCloudfront",
    rules: rulesArray,
    scope: "CLOUDFRONT",
    tags: tags,
    visibilityConfig: {
      cloudwatchMetricsEnabled: false,
      metricName: "webAclBlockDirectAccessToCloudfront",
      sampledRequestsEnabled: false,
    },
  },
  { provider: usEastRegion }
);

const cfFunctions: pulumi.Input<
  pulumi.Input<aws.types.input.cloudfront.DistributionDefaultCacheBehaviorFunctionAssociation>[]
> = [];
const cfBuildHeader = provisionCloudfrontFunction();
cfFunctions.push({
  eventType: "viewer-request",
  functionArn: cfBuildHeader.arn,
});

// distributionArgs configures the CloudFront distribution. Relevant documentation:
// https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/distribution-web-values-specify.html
// https://www.terraform.io/docs/providers/aws/r/cloudfront_distribution.html
const distributionArgs: aws.cloudfront.DistributionArgs = {
  comment: "Cloudfront Settings for a simple static s3 website",
  webAclId: webAcl.arn,
  aliases: distributionAliases,
  enabled: true,
  tags: tags,
  //one origin for this distribution: the S3 content bucket
  origins: [
    {
      originId: staticContentBucket.arn,
      originAccessControlId: originAccessControl.id,
      domainName: staticContentBucket.bucketRegionalDomainName,
    },
  ],
  defaultRootObject: "index.html",
  // A CloudFront distribution can configure different cache behaviors based on the request path.
  // Here we just specify a single, default cache behavior which is just read-only requests to S3.
  defaultCacheBehavior: {
    targetOriginId: staticContentBucket.arn,
    viewerProtocolPolicy: "redirect-to-https",
    allowedMethods: ["GET", "HEAD", "OPTIONS"],
    cachedMethods: ["GET", "HEAD", "OPTIONS"],
    forwardedValues: {
      cookies: { forward: "none" },
      queryString: false,
    },
    minTtl: 0,
    defaultTtl: tenMinutes,
    maxTtl: tenMinutes,
    functionAssociations: cfFunctions,
  },
  // "100" is the cheapest and cover the europe area
  priceClass: "PriceClass_100",
  customErrorResponses: [
    { errorCode: 404, responseCode: 404, responsePagePath: "/404.html" },
  ],
  restrictions: {
    geoRestriction: {
      restrictionType: "none",
    },
  },
  viewerCertificate: {
    acmCertificateArn: certificateArn, // refer to the ssl cert created earlier
    sslSupportMethod: "sni-only",
  },
};

const cdn = new aws.cloudfront.Distribution(
  `${config.targetDomain}-cdn`,
  distributionArgs
);

const bucketPolicy = new aws.s3.BucketPolicy("content-bucket-policy", {
  bucket: staticContentBucket.id, // refer to the bucket created earlier
  policy: pulumi
    .all([cdn.arn, staticContentBucket.arn])
    .apply(([cdnArn, bucketArn]) =>
      JSON.stringify({
        Id: "PolicyForCloudFrontPrivateContent",
        Version: "2012-10-17",
        Statement: [
          {
            Sid: "AllowCloudFrontServicePrincipal",
            Effect: "Allow",
            Principal: {
              Service: "cloudfront.amazonaws.com",
            }, // Only allow Cloudfront read access.
            Action: ["s3:GetObject"],
            Resource: [`${bucketArn}/*`],
            Condition: {
              StringEquals: {
                "AWS:SourceArn": cdnArn,
              },
            },
          },
        ],
      })
    ),
});

// Of course we want to block public access to the bucket
const bucketPublicAccessBlock = new aws.s3.BucketPublicAccessBlock(
  "content-bucket-public-access-block",
  {
    bucket: staticContentBucket.id,
    blockPublicAcls: true,
    blockPublicPolicy: true,
    ignorePublicAcls: true,
    restrictPublicBuckets: true,
  }
);

const aRecord = createAliasRecord(config.targetDomain, cdn);

if (config.includeWwwSubDomain) {
  const cnameRecord = createWWWAliasRecord(config.targetDomain, cdn);
}

// Display all endpoints to terminal at the end of `pulumi up` or `pulumi preview`
export const contentBucketUri = pulumi.interpolate`s3://${staticContentBucket.bucket}`;
export const contentBucketWebsiteEndpoint = staticContentBucket.websiteEndpoint;
export const cloudFrontDomain = cdn.domainName;
export const targetDomainEndpoint = `https://${config.targetDomain}/`;
