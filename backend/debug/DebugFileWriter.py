import os
import logging
import uuid

from config import DEBUG_DIR, IS_DEBUG_ENABLED


class DebugFileWriter:
    def __init__(self):
        if not IS_DEBUG_ENABLED:
            return

        try:
            self.debug_artifacts_path = os.path.expanduser(
                f"{DEBUG_DIR}/{str(uuid.uuid4())}"
            )
            os.makedirs(self.debug_artifacts_path, exist_ok=True)
            print(f"Debugging artifacts will be stored in: {self.debug_artifacts_path}")
        except:
            logging.error("Failed to create debug directory")

    def write_to_file(self, filename: str, content: str) -> None:
        try:
            with open(os.path.join(self.debug_artifacts_path, filename), "w") as file:
                file.write(content)
        except Exception as e:
            logging.error(f"Failed to write to file: {e}")

    def extract_html_content(self, text: str) -> str:
        return str(text.split("<html>")[-1].rsplit("</html>", 1)[0] + "</html>")
