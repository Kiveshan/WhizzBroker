/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import { InstructionLoadingGate } from "../../../components/instructions/InstructionLoadingGate";

describe("InstructionLoadingGate", () => {
  it("shows loading message when isLoadingComplete is false", () => {
    render(
      <InstructionLoadingGate
        isLoadingComplete={false}
        hasDataFailure={false}
        onRetry={jest.fn()}
      >
        <div>Form content</div>
      </InstructionLoadingGate>
    );
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
    expect(screen.queryByText("Form content")).not.toBeInTheDocument();
  });

  it("shows failure message and retry button when data failed to load", () => {
    const onRetry = jest.fn();
    render(
      <InstructionLoadingGate
        isLoadingComplete={true}
        hasDataFailure={true}
        onRetry={onRetry}
      >
        <div>Form content</div>
      </InstructionLoadingGate>
    );
    expect(
      screen.getByText("Failed to load required data. Please try again.")
    ).toBeInTheDocument();
    expect(screen.getByText("Retry")).toBeInTheDocument();
    expect(screen.queryByText("Form content")).not.toBeInTheDocument();
  });

  it("calls onRetry when retry button is clicked", () => {
    const onRetry = jest.fn();
    render(
      <InstructionLoadingGate
        isLoadingComplete={true}
        hasDataFailure={true}
        onRetry={onRetry}
      >
        <div>Form content</div>
      </InstructionLoadingGate>
    );
    fireEvent.click(screen.getByText("Retry"));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("renders custom failure message", () => {
    render(
      <InstructionLoadingGate
        isLoadingComplete={true}
        hasDataFailure={true}
        failureMessage="Custom error message"
        onRetry={jest.fn()}
      >
        <div>Form content</div>
      </InstructionLoadingGate>
    );
    expect(screen.getByText("Custom error message")).toBeInTheDocument();
  });

  it("renders children when loading is complete and no failure", () => {
    render(
      <InstructionLoadingGate
        isLoadingComplete={true}
        hasDataFailure={false}
        onRetry={jest.fn()}
      >
        <div>Form content</div>
      </InstructionLoadingGate>
    );
    expect(screen.getByText("Form content")).toBeInTheDocument();
    expect(screen.queryByText("Loading data...")).not.toBeInTheDocument();
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });

  it("loading takes priority over failure when isLoadingComplete is false", () => {
    render(
      <InstructionLoadingGate
        isLoadingComplete={false}
        hasDataFailure={true}
        onRetry={jest.fn()}
      >
        <div>Form content</div>
      </InstructionLoadingGate>
    );
    expect(screen.getByText("Loading data...")).toBeInTheDocument();
    expect(screen.queryByText("Retry")).not.toBeInTheDocument();
  });
});
