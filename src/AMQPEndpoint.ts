import {Channel, Connection} from "amqplib";

export interface AMQPRPCParams {
  requestsQueue?: string;
  repliesQueue?: string;
  timeout?: number;
  defaultMessageOptions?: any;
}



/**
 * Base class for AMQPRPCServer/AMQPRPCClient.
 *
 * @class
 */
export default class AMQPEndpoint {
    /**
     *
     * @param {*} connection Connection reference created from `amqplib` library
     *
     * @param {Object} [params]
     */
    protected _channel: Channel | null;

    constructor(
      private _connection: Connection,
      protected _params: AMQPRPCParams = {}
    ) {
        this._params = Object.assign({}, _params);
        this._channel = null;
    }

    /**
     * Initialization before starting working
     * NOTE! Race condition is not handled here,
     *    so it's better to not invoke the method several times (e.g. from multiple "threads")
     *
     * @return {Promise<void>}
     */
    async start() {
        if (this._channel) {
            return;
        }

        this._channel = await this._connection.createChannel();
    }

    /**
     * Opposite to this.start() – clearing
     * NOTE! Race condition is not handled here,
     *    so it's better to not invoke the method several times (e.g. from multiple "threads")
     *
     * @return {Promise<void>}
     */
    async disconnect() {
        if (!this._channel) return;
        await this._channel.close();
        this._channel = null;
    }
}
