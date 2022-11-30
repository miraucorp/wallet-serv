import * as AWS from "aws-sdk";
import * as variables from "../variables";

AWS.config.update({
  region: variables.awsRegion,
});

export const ddbDocClient = new AWS.DynamoDB.DocumentClient();
export const sqs = new AWS.SQS({ apiVersion: "2012-11-05" });
