/* global assert */

exports.Utils = {
    isException(error) {
        if (error == undefined)
            error = ""; // handle cases when error hasn't happend but it should.
        let strError = error.toString();
        return strError.includes('invalid opcode') || strError.includes('invalid JUMP') || strError.includes('revert');
    },
    ensureException(error) {
        assert.equal(this.isException(error), true);

    },
    async timeDifference(timestamp1, timestamp2) {
        var difference = timestamp1 - timestamp2;
        return difference;
    },
    convertHex(hexx) {
        var hex = hexx.toString(); //force conversion
        var str = '';
        for (var i = 0; i < hex.length; i += 2) {
            let char = String.fromCharCode(parseInt(hex.substr(i, 2), 16));
            if (char != '\u0000') str += char;
        }
        return str;
    }
};
