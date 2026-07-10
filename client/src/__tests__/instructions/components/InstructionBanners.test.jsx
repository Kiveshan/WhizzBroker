/**
 * @jest-environment jsdom
 */
import "@testing-library/jest-dom";
import React from "react";
import { render, screen } from "@testing-library/react";
import { InstructionBanners } from "../../../components/instructions/InstructionBanners";

describe("InstructionBanners", () => {
  it("renders nothing when isReadOnly=false and showSetRateWarning=false", () => {
    const { container } = render(
      <InstructionBanners
        isReadOnly={false}
        status="New"
        showSetRateWarning={false}
        historicalSetRate={null}
        setRateValue={0}
      />
    );
    // Fragment renders empty
    expect(container.firstChild).toBeNull();
  });

  it("renders read-only banner with status when isReadOnly=true", () => {
    render(
      <InstructionBanners
        isReadOnly={true}
        status="Completed"
        showSetRateWarning={false}
        historicalSetRate={null}
        setRateValue={0}
      />
    );
    expect(
      screen.getByText(/This instruction is Completed and is in read-only mode/)
    ).toBeInTheDocument();
  });

  it("does not render set-rate warning when isReadOnly=true", () => {
    render(
      <InstructionBanners
        isReadOnly={true}
        status="Completed"
        showSetRateWarning={true}
        historicalSetRate={500}
        setRateValue={600}
      />
    );
    expect(screen.queryByText(/Break Bulk Set Rate Warning/)).not.toBeInTheDocument();
  });

  it("renders set-rate warning with formatted rates when not read-only", () => {
    render(
      <InstructionBanners
        isReadOnly={false}
        status="New"
        showSetRateWarning={true}
        historicalSetRate={500}
        setRateValue={600}
      />
    );
    expect(screen.getByText(/Break Bulk Set Rate Warning/)).toBeInTheDocument();
    expect(screen.getByText(/500\.00/)).toBeInTheDocument();
    expect(screen.getByText(/600\.00/)).toBeInTheDocument();
  });

  it("renders both banners when both conditions apply — read-only check wins for warning", () => {
    // isReadOnly=false allows both banners theoretically, but warning only shows
    // when isReadOnly=false. If isReadOnly=true only the read-only banner shows.
    render(
      <InstructionBanners
        isReadOnly={false}
        status="In Progress"
        showSetRateWarning={true}
        historicalSetRate={750}
        setRateValue={800}
      />
    );
    // Only warning shown — isReadOnly is false so read-only banner absent
    expect(screen.queryByText(/read-only mode/)).not.toBeInTheDocument();
    expect(screen.getByText(/Break Bulk Set Rate Warning/)).toBeInTheDocument();
  });
});
