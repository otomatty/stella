public class Q10PrintAbsDiffsTests
{
    [Fact(DisplayName = "Q10 隣との差を出す")]
    public void Q10PrintAbsDiffs()
    {
        Assert.Equal("7\n4\n14\n", ConsoleOutput.Capture(() => Answers.Q10PrintAbsDiffs(new int[] { 3, 10, 6, 20 })));
        Assert.Equal("0\n", ConsoleOutput.Capture(() => Answers.Q10PrintAbsDiffs(new int[] { 5, 5 })));
        Assert.Equal("1\n2\n", ConsoleOutput.Capture(() => Answers.Q10PrintAbsDiffs(new int[] { 1, 2, 4 })));
    }
}
