import React, { useState, useEffect } from 'react';
import i18n from '../../i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import './LanguageSelector.css';

type Languages = 'en' | 'zh';

const LanguageSelector: React.FC = () => {
  const getBrowserLanguage = () => {
    const browserLang = navigator.language.split('-')[0];
    return (['en', 'zh'].includes(browserLang) ? browserLang : 'en') as Languages;
  };

  const [selectedLang, setSelectedLang] = useState<Languages>(i18n.language as Languages);

  useEffect(() => {
    const defaultLang = getBrowserLanguage();
    if (defaultLang !== i18n.language) {
      i18n.changeLanguage(defaultLang);
      setSelectedLang(defaultLang);
    }
  }, []);

  const handleLanguageChange = (value: string) => {
    const nextLang = value as Languages;
    i18n.changeLanguage(nextLang);
    setSelectedLang(nextLang);
  };

  return (
    <Select onValueChange={handleLanguageChange} value={selectedLang}>
      <SelectTrigger className="w-[100px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="zh">中文</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default LanguageSelector;