import * as aws from "@pulumi/aws";
import { createCloudfrontUrlRewriterFunction } from "./create-cloudfront-url-rewriter-function";

/**
 * Create a Cloudfront function for rewriting the URLs
 * 
 * @returns the cloudfront function
 */
export function provisionCloudfrontFunction(): aws.cloudfront.Function {
  return new aws.cloudfront.Function("rewrite-url-cf-function", {
    name: "rewrite-url",
    comment:
      "Handle cloudfront's inability to handle index.htmls in subfolders",
    runtime: "cloudfront-js-1.0",
    publish: true,
    code: createCloudfrontUrlRewriterFunction(),
  });
}
