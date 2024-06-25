#!/usr/bin/env node
/* eslint-disable node/no-missing-import */
/* eslint-disable node/file-extension-in-import */
/* eslint-disable node/no-unsupported-features/es-syntax */
// eslint-disable-next-line node/shebang
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { CloudfrontStack } from '../stacks/assets';

const app = new cdk.App();
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };
new CloudfrontStack(app, 'zipaki-qa-assets', {
    bucketName: 'zipaki-assets-qa',
    cloudfrontCertificateArn: 'arn:aws:acm:us-east-1:076872044204:certificate/1a8b6eec-d427-4aa3-8fea-f54292f8f2de',
    cloudfrontCname: 'assets-qa.zipaki.com',
    env
})

new CloudfrontStack(app, 'zipaki-prod-assets', {
    bucketName: 'zipaki-assets-prod',
    cloudfrontCertificateArn: 'arn:aws:acm:us-east-1:076872044204:certificate/1a8b6eec-d427-4aa3-8fea-f54292f8f2de',
    cloudfrontCname: 'assets.zipaki.com',
    env
})