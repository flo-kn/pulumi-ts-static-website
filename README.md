# pulumi-ts-static-website

Pulumi Typescript Project to deploy static website content and infrastructure via IAC (infrastructure-as-code).

*Infrastructure components:* S3 Buckets, Cloudfront, Cloudfront Functions ACM SSL Certs, AWS Route 53 DNS, WebACL 

*Content:* A Website to publish blog posts

> _hint: Beware of potential costs that the [WebACL causes](https://aws.amazon.com/waf/pricing/). Should be a fixed amount arround $6 per month without the usage based price component._

## Getting Started

Prerequs:

- Some Pulumi KnowHow
- Basic Typescript Node Knowledge
- An AWS account with AdministratorAccess or similar permissionSet
- AWS knowledge, alternative knowledge in some other hyperscaler (Azure, GCP) should be sufficient

Dependencies:
- [Pulumi](https://www.pulumi.com/docs/install/)
- [yarn](https://classic.yarnpkg.com/lang/en/docs/install/#mac-stable)
- [AWS CLI v2](https://docs.aws.amazon.com/cli/latest/userguide/getting-started-install.html)

### Login to Cloud account (AWS):

[Login](https://docs.aws.amazon.com/signin/latest/userguide/how-to-sign-in.html) to your AWS account with your terminal. I highly recommend using [AWS SSO](https://docs.aws.amazon.com/sdkref/latest/guide/access-sso.html) in combination with a configured AWS profile. More details on different options to sign in [here](https://docs.aws.amazon.com/signin/latest/userguide/how-to-sign-in.html).

Test that you are logged into the right account:
```sh
aws sts get-caller-identity --profile <your-profile>
```

Choose a name for your [Pulumi Backend](https://www.pulumi.com/docs/intro/concepts/state/) export it as env var to your terminal...
```sh
export PULUMI_BACKEND=<your-pulumi-backend-name>
```

...and create the s3 bucket holding later holding the remote state of the IAC project by doing the following. Only execute this command once at inital setup of the project:

```sh
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

### Add some static HTML content

Static content gets picked up from the folder `./public`. So put all your HTML, CSS, etc. in there.

E.g. to just test the deployment, create a new file called `index.html` in the public folder 

```html
<html>
  <head>
    <title>Hello Static Website</title><meta charset="UTF-8">
  </head>
  <body>
    <p>Hello, world! Still under construction. 🏗 </p>
  </body>
</html>
```

### Configure and preview the deployment
```sh 
pulumi preview
```

Pulumi might prompt you for missing configs. In the end it should create a stack `.yaml`-file containing all pulumi configs. You can think of them as environment variables for your infrastructure project:

`./Pulumi.my-cool-blog-prod.yaml`
```yaml
encryptionsalt: v1:abcDEF123XZW=:v1:ABC123//:12345678xxxxxxxxxxxx
config:
  static-website:pathToWebsiteContents: public
  static-website:targetDomain: blog.mycooldomain.com
  static-website:author: JonDoe
  static-website:organization: JonDoesOrg
```
> Hint: Dont worry about commiting the `encryptionsalt`. It's the encryption salt of your PULUMI_PASSPHRASE and NOT a secret. 

### Deploy the stack:
```sh 
pulumi up
```
_(will deploy all infrastructure needed to host the static content and sync the content in the local `./public` folder with the s3 bucket.)_

### Finishing up 
Add the `.yaml`-file with the configs to your source code version control similar to ensure smooth login next time you want to conduct a change. The PULUMI_PASSPHRASE you should keep secret though. I'd recommend to share within your infrastructure team in your favorite seretmanager. 

Congrats! 🥳 You successfully deployed a static edge optimized website via IAC. 

TODOs:
- [ ] Solution for uncommenting bucketPublicAccessBlock before deploying to the bucket
- [ ] Add a on/off switch to WebACL

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
