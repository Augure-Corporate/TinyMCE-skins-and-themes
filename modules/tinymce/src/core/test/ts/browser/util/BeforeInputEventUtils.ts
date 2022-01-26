import { TinyAssertions, TinyContentActions, TinySelections } from '@ephox/wrap-mcagar';
import { assert } from 'chai';

import Editor from 'tinymce/core/api/Editor';
import { EditorEvent } from 'tinymce/core/api/util/EventDispatcher';
import * as InsertNewLine from 'tinymce/core/newline/InsertNewLine';
import Env from 'tinymce/src/core/main/ts/api/Env';
import { NormalizedEvent } from 'tinymce/src/core/main/ts/events/EventUtils';

export const testBeforeInputEvent = (performEditAction: (editor: Editor) => void, eventType: string, expectMoreEventsIfSafari: boolean) =>
  (
    editor: Editor,
    setupHtml: string,
    setupPath: number[],
    setupOffset: number,
    expectedHtml: string,
    cancelBeforeInput: boolean
  ) => {
    const inputEvents: string[] = [];
    const collect = (event: NormalizedEvent<InputEvent, any>) => {
      inputEvents.push(event.inputType);
    };
    const beforeInputCollect = (event: NormalizedEvent<InputEvent, any>) => {
      collect(event);

      if (cancelBeforeInput) {
        event.preventDefault();
      }
    };

    editor.on('input', collect);
    editor.on('beforeinput', beforeInputCollect);
    editor.setContent(setupHtml);
    TinySelections.setCursor(editor, setupPath, setupOffset);
    performEditAction(editor);
    editor.off('beforeinput', beforeInputCollect);
    editor.off('input', collect);

    TinyAssertions.assertContent(editor, expectedHtml);

    const moreEvents = expectMoreEventsIfSafari && Env.browser.isSafari();
    const expectedNoCancelEvents = moreEvents ? [ eventType, eventType, eventType ] : [ eventType, eventType ];
    assert.deepEqual(inputEvents, cancelBeforeInput ? [ eventType ] : expectedNoCancelEvents);
  };

export const pressKeyAction = (key: number) =>
  (editor: Editor) => TinyContentActions.keydown(editor, key);

export const insertNewLineAction = (editor: Editor) => InsertNewLine.insert(editor, {} as EditorEvent<KeyboardEvent>);
