/**
 * LedgerJS - JavaScript port of ledgerblue
 * 
 * A library for loading applications onto Ledger hardware wallets
 */

// Core exports
export { CommException, getPossibleErrorCause } from './src/commException.js';
export { IntelHexParser, IntelHexPrinter, IntelHexArea, hexToBytes, bytesToHex } from './src/hexParser.js';
export { wrapCommandAPDU, unwrapResponseAPDU, splitIntoPackets, combinePackets } from './src/ledgerWrapper.js';
export { PrivateKey, PublicKey } from './src/ecWrapper.js';
export { getDeployedSecretV1, getDeployedSecretV2 } from './src/deployed.js';
export { TransportWebHID, TransportMock, getDongle } from './src/transport.js';
export { 
    HexLoader, 
    encodelv, 
    encodetlv,
    BOLOS_TAG_APPNAME,
    BOLOS_TAG_APPVERSION,
    BOLOS_TAG_ICON,
    BOLOS_TAG_DERIVEPATH,
    BOLOS_TAG_DATASIZE,
    BOLOS_TAG_DEPENDENCY
} from './src/hexLoader.js';
export { 
    loadApp, 
    deleteApp, 
    listApps, 
    getMemInfo,
    parseBip32Path,
    parseSlip21Path,
    TARGET_IDS,
    CURVES
} from './src/loadApp.js';

