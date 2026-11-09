public class Q05PrintGteKTests
{
    [Fact(DisplayName = "Q05 K以上だけ出す")]
    public void Q05PrintGteK()
    {
        Assert.Equal("9\n11\n6\n", ConsoleOutput.Capture(() => Answers.Q05PrintGteK(new int[] { 3, 9, 4, 11, 6 }, 6)));
        Assert.Equal("", ConsoleOutput.Capture(() => Answers.Q05PrintGteK(new int[] { 1, 2, 3 }, 10)));
        Assert.Equal("5\n", ConsoleOutput.Capture(() => Answers.Q05PrintGteK(new int[] { 5 }, 5)));
    }
}
