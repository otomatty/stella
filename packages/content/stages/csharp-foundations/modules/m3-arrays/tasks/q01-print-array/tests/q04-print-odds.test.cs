public class Q04PrintOddsTests
{
    [Fact(DisplayName = "Q04 奇数の要素だけ出す")]
    public void Q04PrintOdds()
    {
        Assert.Equal("3\n9\n11\n", ConsoleOutput.Capture(() => Answers.Q04PrintOdds(new int[] { 3, 9, 4, 11, 6 })));
        Assert.Equal("", ConsoleOutput.Capture(() => Answers.Q04PrintOdds(new int[] { 2, 4 })));
        Assert.Equal("7\n", ConsoleOutput.Capture(() => Answers.Q04PrintOdds(new int[] { 7 })));
    }
}
