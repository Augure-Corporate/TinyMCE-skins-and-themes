import { Attachment, Channels, Gui, SystemEvents } from '@ephox/alloy';
import { Arr } from '@ephox/katamari';
import { DomEvent, EventArgs, SugarDocument, SugarElement } from '@ephox/sugar';

import Editor from 'tinymce/core/api/Editor';
import { AfterProgressStateEvent } from 'tinymce/core/api/EventTypes';
import { EditorEvent } from 'tinymce/core/api/util/EventDispatcher';

import { getScrollableContainer } from './api/Options';

const setup = (editor: Editor, mothership: Gui.GuiSystem, uiMotherships: Gui.GuiSystem[]): void => {
  const broadcastEvent = (name: string, evt: EventArgs) => {
    Arr.each([ mothership, ...uiMotherships ], (ship) => {
      ship.broadcastEvent(name, evt);
    });
  };

  const broadcastOn = (channel: string, message: Record<string, any>) => {
    Arr.each([ mothership, ...uiMotherships ], (ship) => {
      ship.broadcastOn([ channel ], message);
    });
  };

  const fireDismissPopups = (evt: EventArgs) => broadcastOn(Channels.dismissPopups(), { target: evt.target });

  // Document touch events
  const doc = SugarDocument.getDocument();
  const onTouchstart = DomEvent.bind(doc, 'touchstart', fireDismissPopups);
  const onTouchmove = DomEvent.bind(doc, 'touchmove', (evt) => broadcastEvent(SystemEvents.documentTouchmove(), evt));
  const onTouchend = DomEvent.bind(doc, 'touchend', (evt) => broadcastEvent(SystemEvents.documentTouchend(), evt));

  // Document mouse events
  const onMousedown = DomEvent.bind(doc, 'mousedown', fireDismissPopups);
  const onMouseup = DomEvent.bind(doc, 'mouseup', (evt) => {
    if (evt.raw.button === 0) {
      broadcastOn(Channels.mouseReleased(), { target: evt.target });
    }
  });

  // Editor content events
  const onContentClick = (raw: UIEvent) => broadcastOn(Channels.dismissPopups(), { target: SugarElement.fromDom(raw.target as Node) });
  const onContentMouseup = (raw: MouseEvent) => {
    if (raw.button === 0) {
      broadcastOn(Channels.mouseReleased(), { target: SugarElement.fromDom(raw.target as Node) });
    }
  };
  const onContentMousedown = () => {
    Arr.each(editor.editorManager.get(), (loopEditor) => {
      if (editor !== loopEditor) {
        loopEditor.dispatch('DismissPopups', { relatedTarget: editor });
      }
    });
  };

  // Window events
  const onWindowScroll = (evt: Event) => broadcastEvent(SystemEvents.windowScroll(), DomEvent.fromRawEvent(evt));
  const onWindowResize = (evt: UIEvent) => {
    broadcastOn(Channels.repositionPopups(), {});
    broadcastEvent(SystemEvents.windowResize(), DomEvent.fromRawEvent(evt));
  };

  const onEditorResize = () => broadcastOn(Channels.repositionPopups(), {});
  const onEditorProgress = (evt: EditorEvent<AfterProgressStateEvent>) => {
    if (evt.state) {
      broadcastOn(Channels.dismissPopups(), { target: SugarElement.fromDom(editor.getContainer()) });
    }
  };

  const onDismissPopups = (event: { relatedTarget: Editor }) => {
    broadcastOn(Channels.dismissPopups(), { target: SugarElement.fromDom(event.relatedTarget.getContainer()) });
  };

  const optOnScrollableContainerScroll = getScrollableContainer(editor).map(
    (scroller) => {
      return DomEvent.bind(scroller, 'scroll', (evt) => {
        console.log('scrolling');
        broadcastEvent(SystemEvents.windowScroll(), DomEvent.fromRawEvent<Event>(evt.raw));
      });
    }
  );

  // Don't start listening to events until the UI has rendered
  editor.on('PostRender', () => {
    editor.on('click', onContentClick);
    editor.on('tap', onContentClick);
    editor.on('mouseup', onContentMouseup);
    editor.on('mousedown', onContentMousedown);
    editor.on('ScrollWindow', onWindowScroll);
    editor.on('ResizeWindow', onWindowResize);
    editor.on('ResizeEditor', onEditorResize);
    editor.on('AfterProgressState', onEditorProgress);
    editor.on('DismissPopups', onDismissPopups);
  });

  editor.on('remove', () => {
    // We probably don't need these unbinds, but it helps to have them if we move this code out.
    editor.off('click', onContentClick);
    editor.off('tap', onContentClick);
    editor.off('mouseup', onContentMouseup);
    editor.off('mousedown', onContentMousedown);
    editor.off('ScrollWindow', onWindowScroll);
    editor.off('ResizeWindow', onWindowResize);
    editor.off('ResizeEditor', onEditorResize);
    editor.off('AfterProgressState', onEditorProgress);
    editor.off('DismissPopups', onDismissPopups);

    onMousedown.unbind();
    onTouchstart.unbind();
    onTouchmove.unbind();
    onTouchend.unbind();
    onMouseup.unbind();

    optOnScrollableContainerScroll.each((u) => u.unbind());
  });

  editor.on('detach', () => {
    Attachment.detachSystem(mothership);
    Arr.each(uiMotherships, Attachment.detachSystem);
    mothership.destroy();
    Arr.each(uiMotherships, (m) => m.destroy());
  });
};

export { setup };
