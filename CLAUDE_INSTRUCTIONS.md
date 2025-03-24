● InputManager › command handling › handleCommand should move selected entities and target enemies when found
    ReferenceError: commands is not defined
      1062 |
      1063 |       // Add simple command object for undo/redo
    > 1064 |       commands.push({
           |       ^
      1065 |         execute: () => true,
      1066 |         undo: () => true
      1067 |       });
      at InputManager.commands [as handleCommand] (src/utils/InputManager.js:1064:7)
      at Object.handleCommand (tests/unit/utils/InputManager.test.js:518:20)
  ● InputManager › command handling › executeCommands adds commands to undoStack and clears redoStack
    TypeError: Cannot read properties of undefined (reading 'push')
      1083 |
      1084 |     // Add to undo stack
    > 1085 |     this.undoStack.push(commands);
           |                    ^
      1086 |   }
      1087 |
      1088 |   // Undo/Redo methods
      at InputManager.push [as executeCommands] (src/utils/InputManager.js:1085:20)
      at Object.executeCommands (tests/unit/utils/InputManager.test.js:554:20)
  ● InputManager › undo/redo functionality › undo executes command undo methods in reverse order
    TypeError: Cannot read properties of undefined (reading 'push')
      568 |       
      569 |       // Add to undoStack
    > 570 |       inputManager.undoStack.push(commands);
          |                              ^
      571 |       
      572 |       // Call undo
      573 |       const result = inputManager.undo();
      at Object.push (tests/unit/utils/InputManager.test.js:570:30)
  ● InputManager › undo/redo functionality › redo executes command execute methods in original order
    TypeError: Cannot read properties of undefined (reading 'push')
      602 |       
      603 |       // Add to redoStack
    > 604 |       inputManager.redoStack.push(commands);
          |                              ^
      605 |       
      606 |       // Call redo
      607 |       const result = inputManager.redo();
      at Object.push (tests/unit/utils/InputManager.test.js:604:30)