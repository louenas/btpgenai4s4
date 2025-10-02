// Ensure compatibility with @cap-js/hana >=2.3 where CQN2SQL expects
// the rendering context to expose a server descriptor. In local setups
// without a connected HANA instance this metadata is missing, which
// leads to "Cannot read properties of undefined (reading 'server')" when
// the INSERT renderer attempts to inspect the server version. We provide
// a safe default before delegating to the original implementation.

const HANAService = require('@cap-js/hana/lib/HANAService');

const originalInsertEntries = HANAService.CQN2SQL.prototype.INSERT_entries;

if (originalInsertEntries && !originalInsertEntries.__patched) {
    HANAService.CQN2SQL.prototype.INSERT_entries = function patchedInsertEntries(...args) {
        if (!this.srv) {
            this.srv = {};
        }
        if (!this.srv.server) {
            this.srv.server = { major: 4 };
        }

        return originalInsertEntries.apply(this, args);
    };

    HANAService.CQN2SQL.prototype.INSERT_entries.__patched = true;
}

module.exports = {};
