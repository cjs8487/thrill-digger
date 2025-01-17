import React from 'react';
import logo from './logo.svg';
import './App.css';
import { SolverWrapper } from "./native/build";
import { GridField, HoleContent } from "./GridField";

type FieldState = {
  bombPercentage: number,
  selectedType: HoleContent,
  ranking: number,
};

type AppState = {
  nativeModule: any,
  currentMessage: string,
  solver: SolverWrapper | null,
  cellStates: FieldState[],
  boardWidth: number,
  boardHeight: number,
};

class TestComp extends React.Component<{}, AppState> {
  constructor(props: AppState) {
    super(props);

    this.state = {
      nativeModule: null,
      currentMessage: "waiting to initialize...",
      solver: null,
      cellStates: [{bombPercentage: 0, selectedType: HoleContent.Unspecified, ranking: 100}],
      boardHeight: 0,
      boardWidth: 0,
    };

    this.selectedChanged = this.selectedChanged.bind(this);
  }

  componentDidMount() {
    import("./native/build").then(native => {
      this.setState({
        nativeModule: native,
        currentMessage: "computing values...",
        solver: native.create_solver(2/* expert */),
      });
      setImmediate(() => {
        console.log("setting state");
        // this takes a really long time
        this.state.solver?.cache_boards();
        const boardHeight = this.state.solver!.get_height();
        const boardWidth = this.state.solver!.get_width();
        const newStates = Array(boardHeight * boardWidth).fill(0).map(() => {
          return {
            bombPercentage: 0,
            selectedType: HoleContent.Unspecified,
            ranking: 100,
          }
        });
        this.setState({
          currentMessage: "done!",
          boardWidth,
          boardHeight,
          cellStates: newStates,
        });
        this.updateBoardAndRecalculateProbs(newStates);
      });
    });
  }

  componentWillUnmount() {
    this.state.solver?.free();
  }

  getSolverOrError(): SolverWrapper {
    if (this.state.solver === null) {
      throw Error("solver is null!");
    }
    return this.state.solver;
  }

  selectedChanged(index: number, selection: HoleContent) {
    const cellStates = this.state.cellStates;
    cellStates[index].selectedType = selection;
    const solver = this.getSolverOrError();
    solver.set_hole(index, selection);
    this.updateBoardAndRecalculateProbs(cellStates);
  }

  // calculate the new probabilites and sets the cellStates to the state at the end
  updateBoardAndRecalculateProbs(cellStates: FieldState[]) {
    const solver = this.getSolverOrError();
    solver.calculate_probabilities_with_pregenerated();
    cellStates.forEach((cellState, index) => {
      cellState.bombPercentage = solver.get_probability(index);
    });
    // figure out the best places for the ranking, don't include already placed
    const cellStatesWithIndex: [number, FieldState][] = cellStates
      .filter(cs => cs.selectedType === HoleContent.Unspecified)
      .map((fieldState, index) => [index, fieldState]);
    cellStatesWithIndex.sort((a,b) => a[1].bombPercentage - b[1].bombPercentage);
    cellStatesWithIndex.forEach(([_, fieldState], index) => fieldState.ranking = index);
    // make all cells, that are already dug up have no ranking
    cellStates.forEach(cs => {
      if (cs.selectedType !== HoleContent.Unspecified) {
        cs.ranking = 100;
      }
    });
    this.setState({
      cellStates,
    });
  }

  resetBoard() {
    const boardHeight = this.state.solver?.get_height() || 0;
    const boardWidth = this.state.solver?.get_width() || 0;
    const cellStates = Array(boardHeight * boardWidth).fill(0).map(() => {
      return {
        bombPercentage: 0,
        selectedType: HoleContent.Unspecified,
        ranking: 100,
      }
    });
    const solver = this.getSolverOrError();
    for (let i = 0;i < boardHeight * boardWidth;i++) {
      solver.set_hole(i, HoleContent.Unspecified);
    }
    this.updateBoardAndRecalculateProbs(cellStates);
  }

  render() {
    const {boardHeight, boardWidth, cellStates, currentMessage} = this.state;
    return (
      <div className="App">
      <h1>Thrill Digger Expert solver</h1>
        <div>{currentMessage}</div>
        <table>
          <tbody>
            {
              Array(boardHeight).fill(0).map((_, y) => {
                return (<tr>
                  {
                    Array(boardWidth).fill(0).map((_, x) => {
                      const index = y * boardWidth + x;
                      const cellState = cellStates[index];
                      return (<td><GridField
                        key={index}
                        bombProbability={cellState.bombPercentage}
                        selectedState={cellState.selectedType}
                        index={index}
                        selectionChangedCallback={this.selectedChanged}
                        ranking={cellState.ranking}></GridField></td>)
                    })
                  }
                </tr>)
              })
            }
          </tbody>
        </table>
        <button onClick={this.resetBoard.bind(this)}>Reset</button>
        <div>Source code: <a href="https://github.com/lepelog/thrill-digger">GitHub</a></div>
      </div>
    );
  }
}

function App() {
  return (
    <TestComp/>
  );
}

export default App;
