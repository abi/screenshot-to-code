import { useEffect, useState } from "react";
import { Settings } from "../../types";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import useThrottle from "../../hooks/useThrottle";
import { Progress } from "../ui/progress";
import { PICO_BACKEND_FORM_SECRET } from "../../config";

interface Props {
  settings: Settings;
  setSettings: React.Dispatch<React.SetStateAction<Settings>>;
}

interface UsageResponse {
  used_credits: number;
  total_credits: number;
  is_valid: boolean;
}

enum FetchState {
  EMPTY = "EMPTY",
  LOADING = "LOADING",
  INVALID = "INVALID",
  VALID = "VALID",
}

function AccessCodeSection({ settings, setSettings }: Props) {
  const [isLoading, setIsLoading] = useState(false);
  const [isValid, setIsValid] = useState(false);
  const [usedCredits, setUsedCredits] = useState(0);
  const [totalCredits, setTotalCredits] = useState(0);
  const throttledAccessCode = useThrottle(settings.accessCode || "", 500);

  const fetchState = (() => {
    if (!settings.accessCode) return FetchState.EMPTY;
    if (isLoading) return FetchState.LOADING;
    if (!isValid) return FetchState.INVALID;
    return FetchState.VALID;
  })();

  async function fetchUsage(accessCode: string) {
    const res = await fetch(
      "https://backend.buildpicoapps.com/screenshot_to_code/get_access_code_usage",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          access_code: accessCode,
          secret: PICO_BACKEND_FORM_SECRET,
        }),
      }
    );
    const usage = (await res.json()) as UsageResponse;

    if (!usage.is_valid) {
      setIsValid(false);
    } else {
      setIsValid(true);
      setUsedCredits(usage.used_credits);
      setTotalCredits(usage.total_credits);
    }

    setIsLoading(false);
  }

  useEffect(() => {
    // Don't do anything if access code is empty
    if (!throttledAccessCode) return;

    setIsLoading(true);
    setIsValid(true);

    // Wait for 500 ms before fetching usage
    setTimeout(async () => {
      await fetchUsage(throttledAccessCode);
    }, 500);
  }, [throttledAccessCode]);

  return (
    <div className="flex flex-col space-y-4 bg-slate-200 p-4 rounded dark:text-white dark:bg-slate-800">
      <Label htmlFor="access-code">
        <div>Access Code</div>
      </Label>

      <Input
        id="access-code"
        className="border-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        placeholder="Enter your Screenshot to Code access code"
        value={settings.accessCode || ""}
        onChange={(e) =>
          setSettings((s) => ({
            ...s,
            accessCode: e.target.value,
          }))
        }
      />

      {fetchState === "EMPTY" && (
        <div className="flex items-center justify-between">
          <a href="https://buy.stripe.com/8wM6sre70gBW1nqaEE" target="_blank">
            <Button size="sm" variant="secondary">
              Buy credits
            </Button>
          </a>
        </div>
      )}

      {fetchState === "LOADING" && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-700">Loading...</span>
        </div>
      )}

      {fetchState === "INVALID" && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-700">Invalid access code</span>
          </div>
        </>
      )}

      {fetchState === "VALID" && (
        <>
          <Progress value={(usedCredits / totalCredits) * 100} />
          <div className="flex items-center justify-between">
            <span className="text-xs text-gray-700">
              {usedCredits} out of {totalCredits} credits used
            </span>
            <a href="https://buy.stripe.com/8wM6sre70gBW1nqaEE" target="_blank">
              <Button size="sm">Add credits</Button>
            </a>
          </div>
        </>
      )}
    </div>
  );
}

export default AccessCodeSection;
