#!/usr/bin/env node
/* eslint-disable node/no-missing-import */
/* eslint-disable node/file-extension-in-import */
/* eslint-disable node/no-unsupported-features/es-syntax */
// eslint-disable-next-line node/shebang
import * as cdk from 'aws-cdk-lib';
import { IRepository, Repository, TagMutability } from 'aws-cdk-lib/aws-ecr';
import { Construct } from 'constructs';
import 'source-map-support/register';

const app = new cdk.App();
const applicationName = 'zipaki-be';
const env = { account: process.env.CDK_DEFAULT_ACCOUNT, region: process.env.CDK_DEFAULT_REGION };

class ApplicationStack extends cdk.Stack {
    /**
     * Onix task repository
     */
    readonly onixRepo: IRepository;
    /**
     * Efs Pull task repository
     */
    readonly efsPullRepo: IRepository;
    /**
     * EPub task repository
     */
    readonly ePubRepo: IRepository;

    constructor(scope: Construct, id: string) {
        super(scope, id, { env });
        const [onixRepo, efsPullRepo, ePubRepo] = ['onix','efs-pull','epub'].map(repo => new Repository(this, repo, {
            imageTagMutability: TagMutability.MUTABLE,
            repositoryName: `${applicationName}/${repo}`,
            removalPolicy: cdk.RemovalPolicy.DESTROY
        }))

        this.onixRepo = onixRepo;
        this.efsPullRepo = efsPullRepo;
        this.ePubRepo = ePubRepo;

        new cdk.CfnOutput(this, 'OnixRepo', {
            value: this.onixRepo.repositoryArn,
            exportName: `${applicationName}OnixRepoArn`,
            description: 'Onix Repository Arn'
        })

        new cdk.CfnOutput(this, 'EfsPullRepo', {
            value: this.efsPullRepo.repositoryArn,
            exportName: `${applicationName}EfsPullRepoArn`,
            description: 'EfsPull Repository Arn'
        })

        new cdk.CfnOutput(this, 'EPubRepo', {
            value: this.ePubRepo.repositoryArn,
            exportName: `${applicationName}EPubRepoArn`,
            description: 'EPub Repository Arn'
        })
    }
}

new ApplicationStack(app, applicationName);

