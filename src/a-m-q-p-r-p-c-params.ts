export default interface AMQPRPCParams {
    requestsQueue?: string;
    repliesQueue?: string;
    timeout?: number;
    defaultMessageOptions?: object;
}
