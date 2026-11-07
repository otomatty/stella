public class CheckASumCountBelowTests
{
    [Fact(DisplayName = "確認A k未満の合計と件数")]
    public void CheckASumCountBelow()
    {
        Assert.Equal("1\n2\n", ConsoleOutput.Capture(() => Answers.CheckASumCountBelow(new int[] { 2, 5, -1 }, 3)));
        Assert.Equal("0\n0\n", ConsoleOutput.Capture(() => Answers.CheckASumCountBelow(new int[] { }, 3)));
        Assert.Equal("0\n0\n", ConsoleOutput.Capture(() => Answers.CheckASumCountBelow(new int[] { 3, 3 }, 3)));
        Assert.Equal("-2\n1\n", ConsoleOutput.Capture(() => Answers.CheckASumCountBelow(new int[] { -2 }, 0)));
    }
}
