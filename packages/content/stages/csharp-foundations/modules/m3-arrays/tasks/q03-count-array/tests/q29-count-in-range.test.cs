public class Q29CountInRangeTests
{
    [Fact(DisplayName = "Q29 範囲内の個数")]
    public void Q29CountInRange()
    {
        Assert.Equal(3, Answers.Q29CountInRange(new int[] { 3, 9, 4, 11, 6 }, 4, 9));
        Assert.Equal(0, Answers.Q29CountInRange(new int[] { 1, 2, 3 }, 10, 20));
    }
}
