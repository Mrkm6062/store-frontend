import React from "react";

import Theme1 from "../themes/theme1/Layout";
import Theme2 from "../themes/theme2/Layout";

const themes = {
  theme1: Theme1,
  theme2: Theme2,
};

const ThemeRenderer = ({ theme, storeData }) => {
  const SelectedTheme = themes[theme] || Theme1;

  return <SelectedTheme storeData={storeData} />;
};

export default ThemeRenderer;