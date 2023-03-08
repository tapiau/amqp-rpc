import assert from "assert";

export enum CommandResultState {
    SUCCESS = "success",
    ERROR = "error",
}

/**
 * This class is responsible for (de)serializing results of a specific commands.
 * Instances of this class are sent by {@link AMQPRPCServer} in response to command requests.
 *
 * @class
 */
export default class CommandResult {
    /**
     * Creates a new instance of a command result.
     *
     * @param {String} state State from {@link CommandResult.STATES}
     * @param {*} data Any type that can be understandable by `JSON.stringify`
     * @example
     * const commandResult = new CommandResult({
     *  state: CommandResult.STATES.ERROR,
     *  data: new Error('Some error description'),
     * });
     *
     * const commandResult = new CommandResult({
     *  state: CommandResult.STATES.SUCCESS,
     *  data: ['some', 'data', 'here'],
     * });
     */
    constructor(
      public state: CommandResultState,
      public data: any
    ) {
    }

    /**
     * Packs a command result into the buffer for sending across queues.
     *
     * @returns {Buffer}
     */
    pack(): Buffer {
        return Buffer.from(JSON.stringify({
            state: this.state,
            data: this.data
        }, CommandResult._replacer));
    }

    /**
     * Returns a dictionary of possible STATES in the result.
     *
     * @static
     * @returns {{SUCCESS: String, ERROR: String}}
     */
    static get STATES() {
        return {
            SUCCESS: "success",
            ERROR: "error"
        };
    }

    /**
     * Simple traverse function for `JSON.stringify`.
     *
     * @static
     * @private
     * @param {String} key
     * @param {*} value
     * @returns {*}
     */
    static _replacer(key: string, value: any) {
        if (value instanceof Error) {
            return {
                message: value.message,
                name: value.name,
                stack: value.stack,
                // code: value.code,
                // fileName: value.fileName,
                // lineNumber: value.lineNumber,
                // columnNumber: value.columnNumber
            };
        }

        return value;
    }

    /**
     * Static helper for creating new instances of {@link CommandResult}.
     *
     * @static
     * @param args
     * @returns {CommandResult}
     */
    static create(state: CommandResultState, data: any) {
        return new this(state, data);
    }

    /**
     * Static helper for creating a new instance of {@link CommandResult} from Buffer.
     *
     * @static
     * @param {Buffer} buffer
     * @returns {CommandResult}
     * @example
     * const commandResult = CommandResult.fromBuffer({state: CommandResult.STATES.SUCCESS, data: []});
     * const buffer = commandResult.pack();
     *
     * assert.instanceOf(buffer, Buffer);
     * assert.deepEqual(CommandResult.fromBuffer(buffer), commandResult);
     */
    static fromBuffer(buffer: Buffer) {
        const str = buffer.toString("utf-8");
        const obj = JSON.parse(str);

        assert(obj.state, "Expect state field to be present and not false it serialized command result");
        assert(
            obj.state === CommandResult.STATES.SUCCESS
            || obj.state === CommandResult.STATES.ERROR,
            `Expect state field to be one of ${CommandResult.STATES.SUCCESS}, ${CommandResult.STATES.ERROR}`
        );

        if (obj.state === CommandResult.STATES.ERROR) {
            const error = new Error(obj.data.message);
            error.stack = obj.data.stack;
            // error.code = obj.data.code;
            // error.columnNumber = obj.data.columnNumber;
            obj.data = error;
        }

        return new CommandResult(obj.state, obj.data);
    }
}
