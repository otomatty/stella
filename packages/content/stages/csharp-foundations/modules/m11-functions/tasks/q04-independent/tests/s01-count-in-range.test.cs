public class S01CountInRangeTests
{
    [Fact(DisplayName = "S01 範囲の個数")]
    public void S01CountInRange()
    {
        Assert.Equal(1, Answers.S01CountInRange(new int[] { 1, 3, 5 }, 2, 4));
        Assert.Equal(0, Answers.S01CountInRange(new int[] { }, 2, 4));
        Assert.Equal(2, Answers.S01CountInRange(new int[] { 2, 4 }, 2, 4));
        Assert.Equal(0, Answers.S01CountInRange(new int[] { 1, 5 }, 2, 4));
    }
}
