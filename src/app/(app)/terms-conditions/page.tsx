import React, { useEffect, useState } from 'react';

const TermsConditions = () => {
  return (
    <div className="flex flex-col items-center rounded-md bg-white px-8 py-10 text-gray-700">
      <p className="w-2/3 py-3">
        By signing, you acknowledge that you are accessing noncustodial open source software, and that you hold
        exclusive responsibility for the consequences of interacting with this software. Any gains or losses that occur
        as the result of your use of this software are entirely the result of your own actions. You agree to hold
        harmless the Electric Development Co and the developers of this software for any losses, regardless of cause,
        including but not limited to bug, hack, liquidation or failure thereof.
      </p>
      <p className="w-2/3 py-3">
        This interface may not be available at all places and times. Users may wish to keep a local copy of the
        interface code, which is open source and available here (LINK), to ensure reliable access to the protocol.
      </p>
      <p className="w-2/3 py-3">
        Access to the onchain protocol and open source frontend code is unrestricted. Access to the frontend operated by
        the Electric Development Co is subject to certain restrictions. By signing, you certify that you are authorized
        to authorize this interface in your jurisdiction and are not a resident of a prohibited jurisdiction according
        to the laws of the United States or of the European Union.
      </p>
      <p className="w-2/3 py-3">
        The Electric Development Co does not collect identifying user data through this interface. The interface
        optionally stores cookies locally to remember that you have read the Terms and Conditions and the Risk
        Statement.
      </p>
    </div>
  );
};

export default TermsConditions;
