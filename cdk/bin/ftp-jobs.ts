#!/usr/bin/env node
/* eslint-disable node/no-missing-import */
/* eslint-disable node/file-extension-in-import */
/* eslint-disable node/no-unsupported-features/es-syntax */
// eslint-disable-next-line node/shebang
import * as cdk from 'aws-cdk-lib';
import 'source-map-support/register';
import { StepFunctionStack } from '../stacks/stepfunction';

const app = new cdk.App();
const applicationName = 'zipaki-be';
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

new StepFunctionStack(app, 'zipaki-be-ftp-sfn-dev', {
    applicationName,
    env,
    environmentName: 'dev',
    cluster: {
        name: 'zipaki-be-prod-Cluster-r0Nrux9CXJNE',
        securityGroupIds: ['sg-0893f0d1977403a22']
    },
    efs: {
        id: 'fs-0ddeef3de6d16e1ce',
        securityGroupId: 'sg-0ae39dc7f46f90405' 
    },
    repos: ['zipaki-be/onix', 'zipaki-be/efs-pull', 'zipaki-be/epub'],
    vpcId: 'vpc-09e1d7ba567c97738',
    keyArn: 'arn:aws:kms:eu-west-1:076872044204:key/16dbc87b-5ad6-4330-b754-fd274d72ac75',
    imageBucket: 'zipaki-imagess-dev',
    cloudfrontEndpoint: 'https://assets-dev.zipaki.com',
})


new StepFunctionStack(app, 'zipaki-be-ftp-sfn-qa', {
    applicationName,
    env,
    environmentName: 'qa',
    cluster: {
        name: 'zipaki-be-prod-Cluster-r0Nrux9CXJNE',
        securityGroupIds: ['sg-0893f0d1977403a22']
    },
    efs: {
        id: 'fs-0ddeef3de6d16e1ce',
        securityGroupId: 'sg-0ae39dc7f46f90405' 
    },
    repos: ['zipaki-be/onix', 'zipaki-be/efs-pull', 'zipaki-be/epub'],
    vpcId: 'vpc-09e1d7ba567c97738',
    keyArn: 'arn:aws:kms:eu-west-1:076872044204:key/16dbc87b-5ad6-4330-b754-fd274d72ac75',
    imageBucket: 'zipaki-assets-qa',
    cloudfrontEndpoint: 'https://assets-qa.zipaki.com',
})

// PROD SFN
new StepFunctionStack(app, 'zipaki-be-ftp-sfn', {
    applicationName,
    env,
    environmentName: 'prod',
    cluster: {
        name: 'zipaki-be-prod-Cluster-r0Nrux9CXJNE',
        securityGroupIds: ['sg-0893f0d1977403a22']
    },
    efs: {
        id: 'fs-0ddeef3de6d16e1ce',
        securityGroupId: 'sg-0ae39dc7f46f90405' 
    },
    repos: ['zipaki-be/onix', 'zipaki-be/efs-pull', 'zipaki-be/epub'],
    vpcId: 'vpc-09e1d7ba567c97738',
    keyArn: 'arn:aws:kms:eu-west-1:076872044204:key/16dbc87b-5ad6-4330-b754-fd274d72ac75',
    imageBucket: 'zipaki-assets-prod',
    cloudfrontEndpoint: 'https://assets.zipaki.com'
})

