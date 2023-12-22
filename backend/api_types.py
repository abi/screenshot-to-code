from pydantic import BaseModel
from typing import Union, Literal, Optional


class ApiProviderInfoBase(BaseModel):
    name: Literal["openai", "azure"]


class OpenAiProviderInfo(ApiProviderInfoBase):
    name: Literal["openai"] = "openai"  # type: ignore
    api_key: str
    base_url: Optional[str] = None


class AzureProviderInfo(ApiProviderInfoBase):
    name: Literal["azure"] = "azure"  # type: ignore
    api_version: str
    api_key: str
    deployment_name: str
    resource_name: str


ApiProviderInfo = Union[OpenAiProviderInfo, AzureProviderInfo]
