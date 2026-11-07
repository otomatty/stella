public class S10PrintUpDownTests
{
    [Fact(DisplayName = "S10 上下の動き")]
    public void S10PrintUpDown()
    {
        Assert.Equal("1\n1\n", ConsoleOutput.Capture(() => Answers.S10PrintUpDown(new int[] { 3, 3, 7, 2 })));
        Assert.Equal("0\n0\n", ConsoleOutput.Capture(() => Answers.S10PrintUpDown(new int[] { })));
        Assert.Equal("0\n0\n", ConsoleOutput.Capture(() => Answers.S10PrintUpDown(new int[] { 1 })));
        Assert.Equal("2\n0\n", ConsoleOutput.Capture(() => Answers.S10PrintUpDown(new int[] { 1, 2, 3 })));
        Assert.Equal("0\n2\n", ConsoleOutput.Capture(() => Answers.S10PrintUpDown(new int[] { 3, 2, 1 })));
    }
}
