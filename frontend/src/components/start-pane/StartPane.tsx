import React from "react";
import ImageUpload from "../ImageUpload";
import { UrlInputSection } from "../UrlInputSection";
import ImportCodeSection from "../ImportCodeSection";
import { Settings } from "../../types";
import { Stack } from "../../lib/stacks";
import { Button } from "../ui/button";
import { useStore } from "../../store/store";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../ui/card";
import { TextToAppSection } from "../TextToAppSection";

interface Props {
  doCreate: (
    images: string[],
    inputMode: "image" | "video",
    textPrompt?: string
  ) => void;
  doCreateFromText: (text: string) => void;
  importFromCode: (code: string, stack: Stack) => void;
  settings: Settings;
}

const StartPane: React.FC<Props> = ({
  doCreate,
  doCreateFromText,
  importFromCode,
  settings,
}) => {
  const setProjectsHistoryDialogOpen = useStore(
    (state) => state.setProjectsHistoryDialogOpen
  );

  return (
    <div className="flex flex-col items-center gap-y-6 pt-8">
      <Card className="w-full max-w-4xl shadow-lg border-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <CardHeader className="text-center space-y-2">
          <CardTitle className="text-3xl font-bold tracking-tight">
            What do you want to build?
          </CardTitle>
          <CardDescription className="text-lg">
            Turn your designs into code in minutes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="screenshot" className="w-full">
            <div className="flex justify-center mb-8">
              <TabsList className="grid w-[400px] grid-cols-3">
                <TabsTrigger value="screenshot">Screenshot</TabsTrigger>
                <TabsTrigger value="url">URL</TabsTrigger>
                <TabsTrigger value="text">Text</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="screenshot" className="mt-0">
              <ImageUpload setReferenceImages={doCreate} />
            </TabsContent>

            <TabsContent value="url" className="mt-0">
              <div className="flex justify-center py-12">
                <div className="w-full max-w-lg">
                  <UrlInputSection
                    doCreate={doCreate}
                    screenshotOneApiKey={settings.screenshotOneApiKey}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="text" className="mt-0">
              <div className="flex justify-center py-6">
                <div className="w-full max-w-2xl">
                  <TextToAppSection doCreateFromText={doCreateFromText} />
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <div className="flex gap-4 items-center text-sm text-muted-foreground">
        <ImportCodeSection importFromCode={importFromCode} />
        <span>or</span>
        <Button
          variant="link"
          className="p-0 h-auto font-normal text-muted-foreground hover:text-foreground underline-offset-4 hover:underline"
          onClick={() => setProjectsHistoryDialogOpen(true)}
        >
          View History
        </Button>
      </div>
    </div>
  );
};

export default StartPane;
