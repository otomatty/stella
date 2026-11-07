public class CheckBLastIndexTests
{
    [Fact(DisplayName = "確認B 最後に現れる位置")]
    public void CheckBLastIndex()
    {
        Assert.Equal(2, Answers.CheckBLastIndex(new int[] { 5, 2, 5 }, 5));
        Assert.Equal(-1, Answers.CheckBLastIndex(new int[] { }, 1));
        Assert.Equal(0, Answers.CheckBLastIndex(new int[] { 4 }, 4));
        Assert.Equal(-1, Answers.CheckBLastIndex(new int[] { 1, 2 }, 3));
    }
}
