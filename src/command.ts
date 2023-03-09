import assert from "assert";

/**
 * This class is responsible for wrapping command structure for sending across queues.
 * It uses when you need to send a command request to an RPC queue in Rabbit.
 *
 * @class
 */
export default class Command {
    /**
     * Creates a new command instance.
     *
     * @param {String} command RPC command name
     * @param {Array<*>} args Array of arguments to provide an RPC
     * @example
     * const command = new Command('commandName', [
     *  {foo: 'bar'},
     *  [1, 2, 3]
     * ]);
     */
    constructor(
      public command: string,
      public args: Array<any> = []
    ) {
    }

    /**
     * Pack a command into the buffer for sending across queues.
     *
     * @returns {Buffer}
     */
    pack(): Buffer {
        return Buffer.from(JSON.stringify({
            command: this.command,
            args: this.args
        }));
    }

    /**
     * Static helper for creating new instances of a Command.
     *
     * @static
     * @param command
     * @param args
     * @returns {Command}
     */
    static create(command: string, ...args: Array<never>) {
        return new this(command, args);
    }

    /**
     * Static helper for creating new Command instances.
     *
     * @static
     * @param {Buffer} buffer
     * @returns {Command}
     */
    static fromBuffer(buffer: Buffer) {
        const str = buffer.toString("utf-8");
        const obj = JSON.parse(str);

        assert(obj.command, "Expect command field to be present and not false in serialized command");
        assert(typeof obj.command === "string", "Expect command field to be string");
        assert(obj.args, "Expect args field to be present and not false in serialized command");
        // assert(obj.args instanceof Array, 'Expect args field to be array');

        return new Command(obj.command, obj.args);
    }
}
