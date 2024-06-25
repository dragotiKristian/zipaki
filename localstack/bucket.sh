#!/bin/bash
set -x
IMAGE_BUCKET="zipaki-images-test"
VIDEO_BUCKET="zipaki-video-test"
APPLICATION_BUCKET="zipaki-application-test"
ASSETS_BUCKET="zipaki-assets-test"

awslocal s3api get-bucket-location --bucket ${IMAGE_BUCKET} || (awslocal s3 mb s3://${IMAGE_BUCKET} && awslocal s3api put-bucket-cors --bucket ${IMAGE_BUCKET} --cors-configuration file:///configs/bucket-config.json)
awslocal s3api get-bucket-location --bucket ${VIDEO_BUCKET} || (awslocal s3 mb s3://${VIDEO_BUCKET} && awslocal s3api put-bucket-cors --bucket ${VIDEO_BUCKET} --cors-configuration file:///configs/bucket-config.json)
awslocal s3api get-bucket-location --bucket ${APPLICATION_BUCKET} || (awslocal s3 mb s3://${APPLICATION_BUCKET} && awslocal s3api put-bucket-cors --bucket ${APPLICATION_BUCKET} --cors-configuration file:///configs/bucket-config.json)
awslocal s3api get-bucket-location --bucket ${ASSETS_BUCKET} || (awslocal s3 mb s3://${ASSETS_BUCKET} && awslocal s3api put-bucket-cors --bucket ${ASSETS_BUCKET} --cors-configuration file:///configs/bucket-config.json)
set +x