
import React from 'react';
import { UI_STRINGS_MY } from '../constants';

const DisclaimerMessage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto w-full my-6 p-4 bg-sky-50 border-l-4 border-sky-400 text-black rounded-md shadow" role="region" aria-labelledby="disclaimer-heading">
      <h3 id="disclaimer-heading" className="font-semibold font-serif text-black">{UI_STRINGS_MY.DISCLAIMER_HEADING}</h3>
      <p className="text-sm mt-1 font-serif">{UI_STRINGS_MY.DISCLAIMER_CONTENT}</p>
    </div>
  );
};

export default DisclaimerMessage;