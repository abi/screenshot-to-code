from pathlib import Path

import pytest
from PIL import Image

from evals.asset_extraction_benchmark import box_iou, build_fixture


def test_live_benchmark_fixture_covers_required_asset_cases(tmp_path: Path) -> None:
    fixture = build_fixture(tmp_path)

    assert len(fixture.image_data_urls) == 2
    assert [path.name for path in fixture.image_paths] == [
        "fixture_source_1.png",
        "fixture_source_2.png",
    ]
    assert all(path.exists() for path in fixture.image_paths)
    with Image.open(fixture.image_paths[0]) as first:
        assert first.size == (1200, 800)
    with Image.open(fixture.image_paths[1]) as second:
        assert second.size == (1000, 700)

    categories = {target.category for target in fixture.targets}
    assert categories == {
        "logo",
        "photo_or_illustration",
        "small_icon",
        "duplicate_instance",
        "multiple_source_images",
        "absent_target",
    }
    assert sum(
        target.category == "duplicate_instance" for target in fixture.targets
    ) == 2
    second_source = next(
        target
        for target in fixture.targets
        if target.category == "multiple_source_images"
    )
    assert second_source.image_index == 2
    absent = next(
        target for target in fixture.targets if target.category == "absent_target"
    )
    assert absent.image_index is None
    assert absent.expected_box_2d is None


def test_box_iou_reports_exact_partial_and_disjoint_boxes() -> None:
    assert box_iou([0, 0, 500, 500], [0, 0, 500, 500]) == 1
    assert box_iou([0, 0, 500, 500], [500, 500, 1000, 1000]) == 0
    assert box_iou([0, 0, 500, 500], [250, 250, 750, 750]) == pytest.approx(
        1 / 7
    )
