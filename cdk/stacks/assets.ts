#!/usr/bin/env node
/* eslint-disable node/no-missing-import */
/* eslint-disable node/file-extension-in-import */
/* eslint-disable node/no-unsupported-features/es-syntax */
// eslint-disable-next-line node/shebang
import * as cdk from "aws-cdk-lib";
import { Certificate } from "aws-cdk-lib/aws-certificatemanager";
import { AllowedMethods, CachePolicy, CachedMethods, Distribution, OriginRequestPolicy, ResponseHeadersPolicy, ViewerProtocolPolicy } from "aws-cdk-lib/aws-cloudfront";
import { S3Origin } from "aws-cdk-lib/aws-cloudfront-origins";
import { BlockPublicAccess, Bucket, HttpMethods } from "aws-cdk-lib/aws-s3";
import { Construct } from "constructs";
import "source-map-support/register";

export class CloudfrontStack extends cdk.Stack {

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
        cloudfrontCertificateArn: string;
        cloudfrontCname: string;

    } & cdk.StackProps
  ) {
    super(scope, id, otherProps);

    const certificate = Certificate.fromCertificateArn(this, 'CloudfrontCertificate', cloudfrontCertificateArn);

    const bucket = new Bucket(this, `${bucketName}Bucket`, {
        cors: [
            {
                allowedMethods: [HttpMethods.POST, HttpMethods.GET, HttpMethods.PUT, HttpMethods.HEAD],
                allowedHeaders: ['*'],
                allowedOrigins: ['*'],
                exposedHeaders: [],
                maxAge: 0
            }
        ],
        publicReadAccess: true,
        blockPublicAccess: BlockPublicAccess.BLOCK_ACLS,
        removalPolicy: cdk.RemovalPolicy.DESTROY,
        bucketName
    })

    const distribution = new Distribution(this, 'AssetsDistribution', {
        defaultBehavior: {
            origin: new S3Origin(bucket),
            viewerProtocolPolicy: ViewerProtocolPolicy.ALLOW_ALL,
            allowedMethods: AllowedMethods.ALLOW_GET_HEAD_OPTIONS,
            cachePolicy: CachePolicy.CACHING_OPTIMIZED,
            originRequestPolicy: OriginRequestPolicy.CORS_CUSTOM_ORIGIN,
            responseHeadersPolicy: ResponseHeadersPolicy.CORS_ALLOW_ALL_ORIGINS_WITH_PREFLIGHT_AND_SECURITY_HEADERS,
            cachedMethods: CachedMethods.CACHE_GET_HEAD_OPTIONS
        },
        certificate,
        
        domainNames: [cloudfrontCname]
    })
  }
}
