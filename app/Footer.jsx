import React from "react";
import { sourceCodePro } from "./styles/fonts";

const Footer = () => {
  return (
    <footer
      className={`p-4 bg-gray-800 text-white w-full grid grid-cols-3 fixed bottom-0 ${sourceCodePro.className}`}
    >
    </footer>
  );
};

export default Footer;
