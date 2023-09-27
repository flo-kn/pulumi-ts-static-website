import * as aws from "@pulumi/aws";
import { getDomainAndSubdomain } from "./get-domain-and-subdomain";

/**
 * Creates a new Route53 DNS record pointing the domain to the CloudFront distribution.
 * 
 * @param targetDomain - fqdn of the website, e.g. blog.mydomain.com
 * @param distribution - the cloudfront distribution
 * @returns the A Record within AWS Route53 Service
 */
export function createAliasRecord(
  targetDomain: string,
  distribution: aws.cloudfront.Distribution
): aws.route53.Record {
  const domainParts = getDomainAndSubdomain(targetDomain);
  const hostedZoneId = aws.route53
    .getZone({ name: domainParts.parentDomain }, { async: true })
    .then((zone) => zone.zoneId);
  return new aws.route53.Record(targetDomain, {
    name: domainParts.subdomain,
    zoneId: hostedZoneId,
    type: "A",
    aliases: [
      {
        name: distribution.domainName,
        zoneId: distribution.hostedZoneId,
        evaluateTargetHealth: true,
      },
    ],
  });
}
