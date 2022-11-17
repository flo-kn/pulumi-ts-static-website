# pulumi-ts-static-website

Pulumi Typescript Project to Deploy Static Website Content and Infrastructure

*Infrastructure components:* S3 Buckets, Cloudfront, Cloudfront Functions ACM SSL Certs, AWS Route 53 DNS, WebACL

*Content:* A Website to publish blog posts

## Getting Started

Prerequs:

- Some Pulumi KnowHow
- Basic Typescript Node Knowledge
- AWS Knowledge
### Login to Cloud account (AWS):

Login to your cloud account with your terminal. E.g. using [AWS SSO](https://docs.aws.amazon.com/sdkref/latest/guide/access-sso.html) and your configured AWS profile

Test that you are logged into the right account:
```
aws sts get-caller-identity --profile <your-profile>
```

Choose a name for your [Pulumi Backend](https://www.pulumi.com/docs/intro/concepts/state/) and create it by following:

```sh
export PULUMI_BACKEND=<your-pulumi-backend-name>
aws s3 mb s3://$PULUMI_BACKEND
```

Login to Pulumi Backend:
```sh
pulumi login s3://$PULUMI_BACKEND
```

### Build the project using [yarn](https://classic.yarnpkg.com/en/):
```sh 
yarn
```

### Create Pulumi Stack
Choose a name for your [Pulumi Stack](https://www.pulumi.com/docs/intro/concepts/stack/) and create the stack:

```sh
export PULUMI_STACK_NAME=<your-stack-name>
pulumi stack init $PULUMI_STACK_NAME
```

For now we simple go with passphrase as [secrets provider](https://www.pulumi.com/docs/intro/concepts/secrets/). Just choose a proper one and enter it to the prompt

### Configure and preview the deployment
```sh 
pulumi preview
```

Pulumi might prompt you for missing configs. In the end it should  have created a stack Yaml file containing all pulumi configs:

`./Pulumi.my-cool-blog-prod.yaml`
```yaml
encryptionsalt: v1:abcDEF123XZW=:v1:ABC123//:12345678xxxxxxxxxxxx
config:
  static-website:pathToWebsiteContents: public
  static-website:targetDomain: blog.mycooldomain.com
  static-website:author: JonDoe
  static-website:organization: JonDoesOrg
```

### Deploy the stack:
```sh 
pulumi up
```

TODOs:
- Solution for uncommenting bucketPublicAccessBlock before deploying to the bucket

Refs:
- Special thanks to the creators of [My Starting Example: Github - Pulumi Examples](https://github.com/pulumi/examples/tree/master/aws-ts-static-website)
- [Pulumi Docs - Starting Sample](https://www.pulumi.com/registry/packages/aws/how-to-guides/s3-website/)
- [Github - Starting sample with outdated code](https://github.com/pulumi/examples/blob/master/aws-ts-static-website/index.ts)
- [WebACL to block direct access to cloudfront.net URL](https://stephenkeable.medium.com/block-direct-access-to-cloudfront-net-urls-when-using-an-alternate-domain-d4d44a357233)
- [AWS Docs - Cloudfront Origin access control](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/private-content-restricting-access-to-s3.html#create-oac-overview)
- [Cloudfront Functions](https://aws.amazon.com/blogs/aws/introducing-cloudfront-functions-run-your-code-at-the-edge-with-low-latency-at-any-scale/)
- [AWS Docs -  Troubleshooting Cloudfront](https://aws.amazon.com/premiumsupport/knowledge-center/cloudfront-troubleshoot-file-access/)
- [Discussion on CF Function vs. Lambda@Edge](https://aws.amazon.com/blogs/compute/implementing-default-directory-indexes-in-amazon-s3-backed-amazon-cloudfront-origins-using-lambdaedge/)
- [AWS Cloudfront Sample Functions](https://github.com/aws-samples/amazon-cloudfront-functions)
- [AWS Docs - Example Function Add Index](https://docs.aws.amazon.com/AmazonCloudFront/latest/DeveloperGuide/example-function-add-index.html)
- [Github - CF Functions for Pulumi](https://github.com/pulumi/pulumi-aws-static-website/blob/bc9ace49b00321b3b5ee9672038781d87a928aa8/provider/cmd/pulumi-resource-aws-static-website/website.ts)
