import { UiFinder } from '@ephox/agar';
import { describe, it } from '@ephox/bedrock-client';
import { Arr, Strings } from '@ephox/katamari';
import { SugarBody, TextContent } from '@ephox/sugar';
import { TinyHooks, TinySelections } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'tinymce/core/api/Editor';

describe('browser.tinymce.core.FontSelectTest', () => {
  const hook = TinyHooks.bddSetupLight<Editor>({
    base_url: '/project/tinymce/js/tinymce',
    toolbar: 'fontsize fontfamily',
    content_style: [
      '.mce-content-body { font-family: Helvetica; font-size: 42px; }',
      '.mce-content-body p { font-family: Arial; font-size: 12px; }',
      '.mce-content-body h1 { font-family: Arial; font-size: 32px; }'
    ].join(''),
    font_size_formats: '8pt=1 12pt 12.75pt 13pt 24pt 32pt'
  }, []);

  const systemFontStackVariants = [
    `-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;`, // Oxide
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji";', // Bootstrap
    '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen-Sans, Ubuntu, Cantarell, "Helvetica Neue", sans-serif;' // Wordpress
  ];

  const assertSelectBoxDisplayValue = (title: string, expectedValue: string) => {
    const selectBox = UiFinder.findIn(SugarBody.body(), '*[title^="' + title + '"]').getOrDie();
    const value = Strings.trim(TextContent.get(selectBox) ?? '');
    assert.equal(value, expectedValue, 'Should be the expected display value');
  };

  it('TBA: Font family and font size on initial page load', () => {
    assertSelectBoxDisplayValue('Font sizes', '12px');
    assertSelectBoxDisplayValue('Fonts', 'Arial');
  });

  it('TBA: Font family and font size on paragraph with no styles', () => {
    const editor = hook.editor();
    editor.setContent('<p>a</p>');
    editor.focus();
    TinySelections.setCursor(editor, [ 0, 0 ], 0);
    editor.nodeChanged();
    // p content style is 12px which does not match any pt values in the font size select values
    assertSelectBoxDisplayValue('Font sizes', '12px');
    assertSelectBoxDisplayValue('Fonts', 'Arial');
  });

  it('TBA: Font family and font size on heading with no styles', () => {
    const editor = hook.editor();
    editor.setContent('<h1>a</h1>');
    editor.focus();
    TinySelections.setCursor(editor, [ 0, 0 ], 0);
    editor.nodeChanged();
    // h1 content style is 32px which matches 24pt in the font size select values so it should be converted
    assertSelectBoxDisplayValue('Font sizes', '24pt');
    assertSelectBoxDisplayValue('Fonts', 'Arial');
  });

  it('TBA: Font family and font size on paragraph with styles that do match font size select values', () => {
    const editor = hook.editor();
    editor.setContent('<p style="font-family: Times; font-size: 17px;">a</p>');
    editor.focus();
    TinySelections.setCursor(editor, [ 0, 0 ], 0);
    editor.nodeChanged();
    // the following should be converted and pick up 12.75pt, although there's a rounded 13pt in the dropdown as well
    assertSelectBoxDisplayValue('Font sizes', '12.75pt');
    assertSelectBoxDisplayValue('Fonts', 'Times');
  });

  it('TBA: Font family and font size on paragraph with styles that do not match font size select values', () => {
    const editor = hook.editor();
    editor.setContent('<p style="font-family: Times; font-size: 18px;">a</p>');
    editor.focus();
    TinySelections.setCursor(editor, [ 0, 0 ], 0);
    editor.nodeChanged();
    // the following should stay as 18px because there's no matching pt value in the font size select values
    assertSelectBoxDisplayValue('Font sizes', '18px');
    assertSelectBoxDisplayValue('Fonts', 'Times');
  });

  it('TBA: Font family and font size on paragraph with legacy font elements', () => {
    const editor = hook.editor();
    editor.setContent('<p><font face="Times" size="1">a</font></p>', { format: 'raw' });
    editor.focus();
    TinySelections.setCursor(editor, [ 0, 0, 0 ], 0);
    editor.nodeChanged();
    assertSelectBoxDisplayValue('Font sizes', '8pt');
    assertSelectBoxDisplayValue('Fonts', 'Times');
  });

  // https://websemantics.uk/articles/font-size-conversion/
  it('TINY-6291: Font size on paragraph with keyword font size is translated to default size', () => {
    const editor = hook.editor();
    editor.setContent('<p style="font-family: Times; font-size: medium;">a</p>');
    editor.focus();
    TinySelections.setCursor(editor, [ 0, 0 ], 0);
    editor.nodeChanged();
    assertSelectBoxDisplayValue('Font sizes', '12pt');
    assertSelectBoxDisplayValue('Fonts', 'Times');
  });

  it('TINY-6291: xx-small will fall back to showing raw font size due to missing 7pt fontsize_format', () => {
    const editor = hook.editor();
    editor.setContent('<p style="font-family: Times; font-size: xx-small;">a</p>');
    editor.focus();
    TinySelections.setCursor(editor, [ 0, 0 ], 0);
    editor.nodeChanged();
    assertSelectBoxDisplayValue('Font sizes', 'xx-small');
    assertSelectBoxDisplayValue('Fonts', 'Times');
  });

  it('TBA: System font stack variants on a paragraph show "System Font" as the font name', () => {
    const editor = hook.editor();
    editor.setContent(Arr.foldl(systemFontStackVariants, (acc, font) => acc + '<p style="font-family: ' + font.replace(/"/g, `'`) + '"></p>', ''));
    editor.focus();
    Arr.each(systemFontStackVariants, (_, idx) => {
      TinySelections.setCursor(editor, [ idx, 0 ], 0);
      editor.nodeChanged();
      assertSelectBoxDisplayValue('Fonts', 'System Font');
    });
  });
});
