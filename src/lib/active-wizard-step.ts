/**
 * Live UI-step bridge for the AI Analyst.
 *
 * Wizard pages keep `currentStep` in React state and usually do NOT write
 * `?step=` into the URL on Next/Back. The Analyst hook cannot see that
 * local state, so wizards publish the 1-based UI step into the analyst store.
 */

import { useAnalystStore } from "@/store/useAnalystStore";

type WizardStepSnapshot = {
  pathname: string;
  uiStep: number;
};

export function publishActiveWizardStep(
  pathname: string,
  uiStep: number | null
): void {
  useAnalystStore.getState().setWizardUiStep(pathname, uiStep);
}

export function getActiveWizardStepSnapshot(): WizardStepSnapshot | null {
  const { wizardPathname, wizardUiStep } = useAnalystStore.getState();
  if (!wizardPathname || wizardUiStep == null) return null;
  return { pathname: wizardPathname, uiStep: wizardUiStep };
}
