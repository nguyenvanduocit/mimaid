Feature: Zoom and Pan Functionality
  As a user of the Mermaid editor
  I want to zoom in and out on diagrams
  So that I can view detailed parts or get an overview of large diagrams

  Background:
    Given I have a Mermaid diagram loaded in the editor
    And the diagram is displayed in the preview pane

  Scenario: Zoom in using zoom button
    Given the diagram is at default scale (1.0)
    When I click the zoom in button (+)
    Then the diagram should scale up by the zoom factor (0.1)
    And the diagram should remain centered in the preview pane
    And the diagram positioning should not break or become distorted

  Scenario: Zoom out using zoom button
    Given the diagram is at a scale greater than minimum (0.5)
    When I click the zoom out button (-)
    Then the diagram should scale down by the zoom factor (0.1)
    And the diagram should remain centered in the preview pane
    And the diagram positioning should not break or become distorted

  Scenario: Zoom with mouse wheel
    Given the diagram is displayed in the preview pane
    When I scroll the mouse wheel up over the diagram
    Then the diagram should zoom in at the mouse cursor position
    And the zoom should feel smooth and responsive
    And the transformation should be consistent with button zoom behavior

  Scenario: Zoom limits are respected
    Given I am zooming in or out
    When the zoom reaches the maximum scale (20) or minimum scale (0.5)
    Then further zooming in that direction should not be possible
    And the diagram should remain stable at the limit

  Scenario: Pan the diagram
    Given the diagram is zoomed in beyond the preview pane boundaries
    When I click and drag on the diagram
    Then the diagram should move following my mouse movement
    And the panning should feel responsive and smooth

  Scenario: Auto-fit functionality
    Given a diagram is loaded
    When the diagram is first rendered
    Then it should automatically fit within the preview pane
    And it should be centered with appropriate padding
    And the zoom state should be reset to the calculated fit scale

  Scenario: Consistent coordinate system
    Given I am using both wheel zoom and button zoom
    When I alternate between different zoom methods
    Then the zoom behavior should be consistent
    And the diagram should not jump or become misaligned
    And the transform calculations should use the same coordinate system

  Scenario: Edge case handling
    Given the diagram has extreme dimensions (very wide or very tall)
    When I use zoom and pan functionality
    Then the diagram should remain stable
    And the transformation should not break or cause visual artifacts
    And the coordinate calculations should handle edge cases gracefully