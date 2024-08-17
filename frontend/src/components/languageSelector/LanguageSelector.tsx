import React, { useState, useEffect } from 'react';
import i18n from '../../i18n';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../ui/select";
import './LanguageSelector.css';

type Languages = 'en' | 'zh' | 'ja' | 'ko' | 'de' | 'ru' | 'fr';

const LanguageSelector: React.FC = () => {
  const [selectedLang, setSelectedLang] = useState<Languages>(i18n.language as Languages);

  useEffect(() => {
    const handleLanguageChanged = (lang: string) => {
      setSelectedLang(lang as Languages);
    };

    i18n.on('languageChanged', handleLanguageChanged);

    return () => {
      i18n.off('languageChanged', handleLanguageChanged);
    };
  }, []);

  const handleLanguageChange = (value: string) => {
    const nextLang = value as Languages;
    i18n.changeLanguage(nextLang);
  };

  return (
    <Select onValueChange={handleLanguageChange} value={selectedLang}>
      <SelectTrigger className="w-[120px]">
        <SelectValue placeholder="Language" />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="en">English</SelectItem>
        <SelectItem value="zh">简体中文</SelectItem>
        <SelectItem value="ja">日本語</SelectItem>
        <SelectItem value="ko">한국어</SelectItem>
        <SelectItem value="de">Deutsch</SelectItem>
        <SelectItem value="ru">Русский</SelectItem>
        <SelectItem value="fr">Français</SelectItem>
      </SelectContent>
    </Select>
  );
};

export default LanguageSelector;