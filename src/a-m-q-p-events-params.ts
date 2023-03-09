/**
 * @class AMQPEventsSender
 * Provides stream like "sink" for events, that should be
 * transported though amqp
 * Should be used with AMQPEventsReceiver. In such case
 * will correctly handle queue removal, connection/disconnection
 * listener destroy providing stream-like events inteface (end/error/close);
 * @emits AMQPEventsSender#data
 * @emits AMQPEventsSender#close
 * @emits AMQPEventsSender#end
 */
//TODO think about: this class may be transformed to real ReadableStream
//when it would be required

export default interface AMQPEventsParams {
    exclusive?: boolean;
    queueName: string;
    TTL?: number;
}
