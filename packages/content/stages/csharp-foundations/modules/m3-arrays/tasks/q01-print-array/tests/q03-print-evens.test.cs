public class Q03PrintEvensTests
{
    [Fact(DisplayName = "Q03 偶数の要素だけ出す")]
    public void Q03PrintEvens()
    {
        Assert.Equal("4\n6\n", ConsoleOutput.Capture(() => Answers.Q03PrintEvens(new int[] { 3, 9, 4, 11, 6 })));
        Assert.Equal("", ConsoleOutput.Capture(() => Answers.Q03PrintEvens(new int[] { 1, 3 })));
        Assert.Equal("8\n", ConsoleOutput.Capture(() => Answers.Q03PrintEvens(new int[] { 8 })));
    }
}
