from prompts.policies import build_selected_stack_policy, build_user_image_policy


class TestBuildSelectedStackPolicy:
    def test_html_tailwind(self) -> None:
        assert build_selected_stack_policy("html_tailwind") == "Selected stack: html_tailwind."

    def test_arbitrary_stack(self) -> None:
        result = build_selected_stack_policy("react_tailwind")
        assert result == "Selected stack: react_tailwind."


class TestBuildUserImagePolicy:
    def test_enabled(self) -> None:
        result = build_user_image_policy(True)
        assert "enabled" in result.lower()
        assert "generate_images" in result
        assert "Do not call" not in result

    def test_disabled(self) -> None:
        result = build_user_image_policy(False)
        assert "disabled" in result.lower()
        assert "Do not call generate_images" in result
        assert "placehold.co" in result
