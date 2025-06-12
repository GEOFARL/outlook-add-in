import {
  teamsLightTheme,
  teamsDarkTheme,
  teamsHighContrastTheme,
  Theme,
} from "@fluentui/react-components";
import { useEffect, useState } from "react";

const themeMap: Record<string, Theme> = {
  light: teamsLightTheme,
  dark: teamsDarkTheme,
  contrast: teamsHighContrastTheme,
};

export function useOfficeTheme(): Theme {
  const [theme, setTheme] = useState<Theme>(teamsLightTheme);

  useEffect(() => {
    const applyTheme = (themeId: string | undefined) => {
      setTheme(themeMap[themeId] ?? teamsLightTheme);
    };

    Office.onReady().then(() => {
      const officeTheme = Office.context.officeTheme as any;
      applyTheme(officeTheme?.themeId);

      if (officeTheme?.onOfficeThemeChanged) {
        officeTheme.onOfficeThemeChanged = () =>
          applyTheme(officeTheme.themeId);
      }
    });
  }, []);

  return theme;
}
