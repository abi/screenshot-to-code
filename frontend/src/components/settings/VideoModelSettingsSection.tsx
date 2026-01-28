import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
} from "../ui/select";
import { Badge } from "../ui/badge";
import { VideoModel, VIDEO_MODEL_DESCRIPTIONS } from "../../lib/models";

interface Props {
  videoModel: VideoModel | undefined;
  setVideoModel: (model: VideoModel) => void;
  label?: string;
  shouldDisableUpdates?: boolean;
}

function VideoModelSettingsSection({
  videoModel,
  setVideoModel,
  label = "Video Model:",
  shouldDisableUpdates = false,
}: Props) {
  return (
    <div className="flex flex-col gap-y-2 justify-between text-sm">
      <div className="grid grid-cols-3 items-center gap-4">
        <span>{label}</span>
        <Select
          value={videoModel}
          onValueChange={(value: string) => setVideoModel(value as VideoModel)}
          disabled={shouldDisableUpdates}
        >
          <SelectTrigger className="col-span-2" id="video-model-settings">
            {videoModel
              ? VIDEO_MODEL_DESCRIPTIONS[videoModel].name
              : "Select a model"}
          </SelectTrigger>
          <SelectContent>
            <SelectGroup>
              {Object.values(VideoModel).map((model) => (
                <SelectItem key={model} value={model}>
                  <div className="flex items-center">
                    {VIDEO_MODEL_DESCRIPTIONS[model].name}
                    {VIDEO_MODEL_DESCRIPTIONS[model].inBeta && (
                      <Badge className="ml-2" variant="secondary">
                        Beta
                      </Badge>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}

export default VideoModelSettingsSection;
