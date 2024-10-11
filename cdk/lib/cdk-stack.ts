import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
import { AstroAWS } from '@astro-aws/constructs';

import { Duration } from 'aws-cdk-lib';
import { Runtime } from 'aws-cdk-lib/aws-lambda';
import {
    CachePolicy,
    CacheQueryStringBehavior,
    CacheCookieBehavior,
    CacheHeaderBehavior,
} from 'aws-cdk-lib/aws-cloudfront';

export class CdkStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        const strava_user_session = new dynamodb.Table(
            this,
            'StravaUserSession',
            {
                partitionKey: {
                    name: 'id',
                    type: dynamodb.AttributeType.STRING,
                },
                tableName: 'strava_user_session',
            }
        );

        const strava_auth_user = new dynamodb.Table(this, 'StravaAuthUser', {
            partitionKey: {
                name: 'id',
                type: dynamodb.AttributeType.NUMBER,
            },
            tableName: 'strava_auth_user',
        });
        strava_auth_user.addGlobalSecondaryIndex({
            indexName: 'stravaId',
            partitionKey: {
                name: 'strava_id',
                type: dynamodb.AttributeType.NUMBER,
            },
        });

        const counters = new dynamodb.Table(this, 'Counters', {
            partitionKey: {
                name: 'counterName',
                type: dynamodb.AttributeType.STRING,
            },
            tableName: 'counters',
        });

        const pb_peaks_table = new dynamodb.Table(this, 'PBPeaksTable', {
            partitionKey: {
                name: 'id',
                type: dynamodb.AttributeType.NUMBER,
            },
            tableName: 'pb_peaks',
        });

        const strava_activities_table = new dynamodb.Table(
            this,
            'StravaActivitiesTable',
            {
                partitionKey: {
                    name: 'user_id',
                    type: dynamodb.AttributeType.NUMBER,
                },
                sortKey: {
                    name: 'id',
                    type: dynamodb.AttributeType.NUMBER,
                },
                tableName: 'strava_activities',
            }
        );

        const cachePolicy = new CachePolicy(this, 'CachePolicy', {
            cachePolicyName: 'AllCookie-AllQuery-OriginHeader',
            comment:
                "Allow all cookies and query strings, and only 'Origin' header.",
            queryStringBehavior: CacheQueryStringBehavior.all(),
            cookieBehavior: CacheCookieBehavior.all(),
            headerBehavior: CacheHeaderBehavior.allowList('Origin'),
        });

        const astroAWS = new AstroAWS(this, 'AstroAWS', {
            cdk: {
                cloudfrontDistribution: {
                    // This configures all subpaths of /api.
                    apiBehavior: {
                        cachePolicy,
                    },
                    // This configures everything excluding subpaths of /api.
                    defaultBehavior: {
                        cachePolicy,
                    },
                },
                lambdaFunction: {
                    timeout: Duration.seconds(25),
                    runtime: Runtime.NODEJS_20_X,
                },
            },
            websiteDir: '../',
        });

        // Add another cloudfront behavior for the Astro _actions directory to
        // ensure PUT requests go through as expected.
        const cfd: AstroAWSCdk = astroAWS.cdk.cloudfrontDistribution;
        const b0 = cfd.additionalBehaviors[0];
        // Ideally we'd create this as an 'additionalBehavior' in the AstroAWS
        // props.cdk.cloudfrontDistribution, but we don't know the origin at that point.
        cfd.addBehavior('/_actions/*', b0.props.origin, {
            allowedMethods: b0.props.allowedMethods,
            originRequestPolicy: b0.props.originRequestPolicy,
            responseHeadersPolicy: b0.props.responseHeadersPolicy,
            viewerProtocolPolicy: b0.props.viewerProtocolPolicy,
            cachePolicy: cachePolicy,
        });
        cfd.addBehavior('/account', b0.props.origin, {
            allowedMethods: b0.props.allowedMethods,
            originRequestPolicy: b0.props.originRequestPolicy,
            responseHeadersPolicy: b0.props.responseHeadersPolicy,
            viewerProtocolPolicy: b0.props.viewerProtocolPolicy,
            cachePolicy: cachePolicy,
        });
    }
}
