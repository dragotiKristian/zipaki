#!/usr/bin/env node
/* eslint-disable node/no-missing-import */
/* eslint-disable node/file-extension-in-import */
/* eslint-disable node/no-unsupported-features/es-syntax */
// eslint-disable-next-line node/shebang
import * as cdk from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import {
  CachePolicy,
  Distribution,
  HeadersFrameOption,
  HeadersReferrerPolicy,
  ResponseHeadersPolicy,
  ViewerProtocolPolicy,
} from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { Effect, Policy, PolicyStatement, User } from "aws-cdk-lib/aws-iam";
import { BlockPublicAccess, Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import "source-map-support/register";

export class StaticFrontendStack extends cdk.Stack {
  constructor(
    scope: Construct,
    id: string,
    {
      bucketName,
      cloudfrontCertificateArn,
      cloudfrontCname,
      ...otherProps
    }: {
      bucketName: string;
      cloudfrontCertificateArn?: string;
      cloudfrontCname?: string;
    } & cdk.StackProps
  ) {
    super(scope, id, otherProps);

    const bucket = new Bucket(this, `${bucketName}Bucket`, {
      cors: [
        {
          allowedMethods: [HttpMethods.POST, HttpMethods.GET, HttpMethods.PUT],
          allowedHeaders: ["*"],
          allowedOrigins: ["*"],
          exposedHeaders: [],
          maxAge: 0,
        },
      ],
      publicReadAccess: true,
      blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
      removalPolicy: cdk.RemovalPolicy.DESTROY,
      bucketName,
      websiteIndexDocument: 'index.html',
      websiteErrorDocument: 'index.html'
    });

    const distribution = new Distribution(this, "FrontendDistribution", {
      defaultBehavior: {
        origin: new S3Origin(bucket, {}),
        viewerProtocolPolicy: ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        cachePolicy: new CachePolicy(this, "FrontendCachePolicy", {
          maxTtl: cdk.Duration.days(365),
          minTtl: cdk.Duration.seconds(1),
          defaultTtl: cdk.Duration.days(1),
        }),
        responseHeadersPolicy: new ResponseHeadersPolicy(
          this,
          "FrontendHeadersPolicy",
          {
            securityHeadersBehavior: {
              strictTransportSecurity: {
                includeSubdomains: true,
                accessControlMaxAge: cdk.Duration.days(730),
                override: true,
              },
              xssProtection: {
                override: true,
                modeBlock: true,
                protection: true,
              },
              contentTypeOptions: {
                override: true,
              },
              referrerPolicy: {
                override: true,
                referrerPolicy:
                  HeadersReferrerPolicy.STRICT_ORIGIN_WHEN_CROSS_ORIGIN,
              },
              frameOptions: {
                override: true,
                frameOption: HeadersFrameOption.SAMEORIGIN,
              },
            },
          }
        ),
      },
      ...(cloudfrontCertificateArn && {
        certificate: Certificate.fromCertificateArn(
          this,
          "CloudfrontCertificate",
          cloudfrontCertificateArn
        )
      }),
      ...(cloudfrontCname && {
        domainNames: [cloudfrontCname]
      })
    });

    const iamUser = new User(this, "GithubActionsUser", {
      userName: `${bucketName}-github-actions`,
    }).attachInlinePolicy(
      new Policy(this, "GithubActionsPolicy", {
        statements: [
          new PolicyStatement({
            resources: [bucket.arnForObjects("*"), bucket.bucketArn],
            effect: Effect.ALLOW,
            actions: [
              "s3:DeleteObject",
              "s3:GetBucketLocation",
              "s3:GetObject",
              "s3:ListBucket",
              "s3:PutObject",
            ],
          }),
          new PolicyStatement({
            resources: [
              this.formatArn({
                resource: "distribution",
                service: "cloudfront",
                resourceName: distribution.distributionId,
                region: ''
              }),
            ],
            effect: Effect.ALLOW,
            actions: [
              "cloudfront:UpdateDistribution",
              "cloudfront:DeleteDistribution",
              "cloudfront:CreateInvalidation",
            ],
          }),
        ],
      })
    );
  }
}
