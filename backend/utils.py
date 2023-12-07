import copy
import json


def pprint_prompt(prompt_messages):
    print(json.dumps(truncate_data_strings(prompt_messages), indent=4))


def truncate_data_strings(data):
    # Deep clone the data to avoid modifying the original object
    cloned_data = copy.deepcopy(data)

    if isinstance(cloned_data, dict):
        for key, value in cloned_data.items():
            # Recursively call the function if the value is a dictionary or a list
            if isinstance(value, (dict, list)):
                cloned_data[key] = truncate_data_strings(value)
            # Truncate the string if it it's long and add ellipsis and length
            elif isinstance(value, str):
                cloned_data[key] = value[:40]
                if len(value) > 40:
                    cloned_data[key] += "..." + f" ({len(value)} chars)"

    elif isinstance(cloned_data, list):
        # Process each item in the list
        cloned_data = [truncate_data_strings(item) for item in cloned_data]

    return cloned_data
