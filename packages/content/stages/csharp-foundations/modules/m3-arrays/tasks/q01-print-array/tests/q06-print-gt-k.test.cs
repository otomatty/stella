public class Q06PrintGtKTests
{
    [Fact(DisplayName = "Q06 Kより大きいものだけ出す")]
    public void Q06PrintGtK()
    {
        Assert.Equal("9\n", ConsoleOutput.Capture(() => Answers.Q06PrintGtK(new int[] { 3, 9, 4 }, 4)));
        Assert.Equal("", ConsoleOutput.Capture(() => Answers.Q06PrintGtK(new int[] { 4, 4, 4 }, 4)));
        Assert.Equal("5\n6\n", ConsoleOutput.Capture(() => Answers.Q06PrintGtK(new int[] { 5, 6 }, 4)));
    }
}
